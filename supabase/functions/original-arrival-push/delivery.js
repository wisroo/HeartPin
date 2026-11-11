export function shouldSendOriginalArrival(transfer, device, now) {
  return transfer?.status === "uploaded"
    && Date.parse(transfer.expires_at) > now
    && device?.user_id === transfer.user_id
    && device?.owner === transfer.dest_owner;
}

export const ORIGINAL_ARRIVAL_DATA = { type: "original_arrival" };
export const ORIGINAL_ARRIVAL_NOTIFICATION = {
  title: "HeartPin",
  body: "받을 원본이 도착했어요.",
};
