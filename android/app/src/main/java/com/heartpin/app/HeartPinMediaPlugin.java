package com.heartpin.app;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
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
import java.io.OutputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "HeartPinMedia",
    permissions = {
        @Permission(strings = { Manifest.permission.ACCESS_MEDIA_LOCATION }, alias = HeartPinMediaPlugin.MEDIA_LOCATION),
        @Permission(strings = { Manifest.permission.READ_MEDIA_IMAGES }, alias = HeartPinMediaPlugin.READ_MEDIA_IMAGES),
        @Permission(strings = { Manifest.permission.READ_EXTERNAL_STORAGE }, alias = HeartPinMediaPlugin.READ_EXTERNAL),
        @Permission(strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "writeLegacy")
    }
)
public class HeartPinMediaPlugin extends Plugin {
    private static final String TAG = "HeartPinMedia";
    static final String MEDIA_LOCATION = "mediaLocation";
    static final String READ_MEDIA_IMAGES = "readMediaImages";
    static final String READ_EXTERNAL = "readExternal";
    private static final int MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

    @PluginMethod
    public void saveOriginal(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("writeLegacy") != PermissionState.GRANTED) {
            requestPermissionForAlias("writeLegacy", call, "savePermissionCallback");
            return;
        }
        writeOriginal(call);
    }

    @PermissionCallback
    private void savePermissionCallback(PluginCall call) {
        if (getPermissionState("writeLegacy") != PermissionState.GRANTED) {
            call.reject("사진함 저장 권한이 필요해요");
            return;
        }
        writeOriginal(call);
    }

    private void writeOriginal(PluginCall call) {
        getBridge().execute(() -> {
            ContentResolver resolver = getContext().getContentResolver();
            Uri photo = null;
            HttpURLConnection connection = null;
            try {
                URL url = new URL(call.getString("url", ""));
                String name = call.getString("filename", "");
                String mimeType = call.getString("mimeType", "");
                if (!"https".equals(url.getProtocol()) || name.isEmpty() || name.equals(".") || name.equals("..")
                    || name.contains("/") || name.contains("\\") || !mimeType.startsWith("image/")) {
                    throw new IOException();
                }
                connection = (HttpURLConnection) url.openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(60000);
                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) throw new IOException();

                boolean supportsPending = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q;
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, name);
                values.put(MediaStore.Images.Media.MIME_TYPE, mimeType);
                if (supportsPending) values.put(MediaStore.Images.Media.IS_PENDING, 1);
                photo = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (photo == null) throw new IOException();
                long written = 0;
                try (InputStream input = connection.getInputStream(); OutputStream output = resolver.openOutputStream(photo)) {
                    if (output == null) throw new IOException();
                    byte[] buffer = new byte[8192];
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        output.write(buffer, 0, count);
                        written += count;
                    }
                }
                long expected = call.getData().optLong("size", 0);
                if (written == 0 || (expected > 0 && written != expected)) throw new IOException();
                if (supportsPending) {
                    ContentValues publish = new ContentValues();
                    publish.put(MediaStore.Images.Media.IS_PENDING, 0);
                    if (resolver.update(photo, publish, null, null) != 1) throw new IOException();
                }
                call.resolve();
            } catch (Exception error) {
                if (photo != null) {
                    try { resolver.delete(photo, null, null); }
                    catch (Exception ignored) { /* Keep the original error visible to the caller. */ }
                }
                call.reject("원본을 사진함에 저장하지 못했어요");
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

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
            if (uris.size() > 1) {
                call.reject("Android 원본 위치정보 업로드는 현재 한 장씩만 지원해요");
                return;
            }
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
        if (bytes.length > MAX_ORIGINAL_BYTES) {
            throw new IllegalStateException("Selected original image is too large for bridge upload");
        }

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
                if (output.size() + read > MAX_ORIGINAL_BYTES) {
                    throw new IllegalStateException("Selected original image is too large for bridge upload");
                }
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
