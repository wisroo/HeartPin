package com.heartpin.app;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.webkit.MimeTypeMap;

import androidx.activity.result.ActivityResult;
import androidx.exifinterface.media.ExifInterface;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "HeartPinMedia",
    permissions = {
        @Permission(strings = { Manifest.permission.ACCESS_MEDIA_LOCATION }, alias = HeartPinMediaPlugin.MEDIA_LOCATION),
        @Permission(strings = { Manifest.permission.READ_MEDIA_IMAGES }, alias = HeartPinMediaPlugin.READ_MEDIA_IMAGES),
        @Permission(strings = { Manifest.permission.READ_EXTERNAL_STORAGE }, alias = HeartPinMediaPlugin.READ_EXTERNAL)
    }
)
public class HeartPinMediaPlugin extends Plugin {
    private static final String TAG = "HeartPinMedia";
    static final String MEDIA_LOCATION = "mediaLocation";
    static final String READ_MEDIA_IMAGES = "readMediaImages";
    static final String READ_EXTERNAL = "readExternal";

    @PluginMethod
    public void pickImages(PluginCall call) {
        if (!hasHeartPinMediaPermissions()) {
            requestPermissionForAliases(requiredPermissionAliases(), call, "mediaPermissionsCallback");
            return;
        }
        openPicker(call);
    }

    @PermissionCallback
    private void mediaPermissionsCallback(PluginCall call) {
        if (!hasHeartPinMediaPermissions()) {
            call.reject("사진과 사진 위치정보 접근 권한이 필요해요");
            return;
        }
        openPicker(call);
    }

    private boolean hasHeartPinMediaPermissions() {
        boolean hasLocation = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || getPermissionState(MEDIA_LOCATION) == PermissionState.GRANTED;
        boolean hasImages = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState(READ_MEDIA_IMAGES) == PermissionState.GRANTED;
        boolean hasLegacyRead = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU || getPermissionState(READ_EXTERNAL) == PermissionState.GRANTED;
        return hasLocation && hasImages && hasLegacyRead;
    }

    private String[] requiredPermissionAliases() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) return new String[] { MEDIA_LOCATION, READ_MEDIA_IMAGES };
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) return new String[] { MEDIA_LOCATION, READ_EXTERNAL };
        return new String[] { READ_EXTERNAL };
    }

    private void openPicker(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
        intent.setType("image/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, call.getBoolean("multiple", true));
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(call, intent, "pickImagesResult");
    }

    @ActivityCallback
    private void pickImagesResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("사진 선택이 취소됐어요");
            return;
        }

        try {
            List<Uri> uris = resultUris(result.getData());
            JSArray photos = new JSArray();
            for (Uri uri : uris) {
                photos.put(readPhoto(uri));
            }
            JSObject ret = new JSObject();
            ret.put("photos", photos);
            call.resolve(ret);
        } catch (Exception error) {
            Log.e(TAG, "Failed to read selected original image", error);
            call.reject("Android 원본 사진을 읽을 수 없어요", error);
        }
    }

    private List<Uri> resultUris(Intent data) {
        ArrayList<Uri> uris = new ArrayList<>();
        ClipData clipData = data.getClipData();
        if (clipData != null) {
            for (int i = 0; i < clipData.getItemCount(); i += 1) {
                Uri uri = clipData.getItemAt(i).getUri();
                if (uri != null) uris.add(uri);
            }
        } else if (data.getData() != null) {
            uris.add(data.getData());
        }
        return uris;
    }

    private JSObject readPhoto(Uri uri) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        byte[] bytes = readOriginalBytes(resolver, uri);

        ExifInterface exif = readExif(bytes);
        float[] latLng = new float[2];
        boolean hasLatLng = exif != null && exif.getLatLong(latLng);

        JSObject photo = new JSObject();
        photo.put("name", displayName(uri));
        photo.put("mimeType", mimeType(uri));
        photo.put("size", bytes.length);
        photo.put("lastModified", System.currentTimeMillis());
        photo.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
        photo.put("takenAt", exif == null ? JSObject.NULL : takenAt(exif));
        photo.put("lat", hasLatLng ? latLng[0] : JSObject.NULL);
        photo.put("lng", hasLatLng ? latLng[1] : JSObject.NULL);
        return photo;
    }

    private byte[] readOriginalBytes(ContentResolver resolver, Uri uri) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                return readBytes(resolver, MediaStore.setRequireOriginal(uri));
            } catch (Exception originalError) {
                Log.w(TAG, "Falling back to selected URI after original read failed: " + uri, originalError);
            }
        }
        return readBytes(resolver, uri);
    }

    private ExifInterface readExif(byte[] bytes) {
        try {
            return new ExifInterface(new ByteArrayInputStream(bytes));
        } catch (Exception error) {
            Log.w(TAG, "Failed to parse EXIF from selected image", error);
            return null;
        }
    }

    private byte[] readBytes(ContentResolver resolver, Uri uri) throws Exception {
        try (InputStream input = resolver.openInputStream(uri); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) throw new IllegalStateException("Input stream is null");
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return output.toByteArray();
        }
    }

    private String displayName(Uri uri) {
        try (Cursor cursor = getContext().getContentResolver().query(uri, new String[] { MediaStore.MediaColumns.DISPLAY_NAME }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME);
                if (index >= 0) return cursor.getString(index);
            }
        } catch (Exception ignored) {
        }
        String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType(uri));
        return "photo-" + System.currentTimeMillis() + "." + (ext == null ? "jpg" : ext);
    }

    private String mimeType(Uri uri) {
        String type = getContext().getContentResolver().getType(uri);
        return type == null ? "image/jpeg" : type;
    }

    private String takenAt(ExifInterface exif) {
        String value = exif.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL);
        if (value == null) value = exif.getAttribute(ExifInterface.TAG_DATETIME);
        return value;
    }
}
