import { useState } from "react";
import { getOwner } from "../api.js";
import RecipientTransferList from "../features/transfers/RecipientTransferList.jsx";

export default function WebRecipientTransfers({ downloadFile }) {
  const [owner, setOwner] = useState(() => getOwner() || "");
  const [message, setMessage] = useState("");

  return (
    <>
      <label>
        받는 사람{" "}
        <select value={owner} onChange={(event) => {
          setOwner(event.target.value);
          setMessage("");
        }}>
          <option value="">선택해 주세요</option>
          <option value="bara">바라</option>
          <option value="nyong">뇽이</option>
        </select>
      </label>
      <p role="status">{message}</p>
      {owner && (
        <RecipientTransferList
          key={owner}
          owner={owner}
          allowPhone={false}
          downloadFile={downloadFile}
          onSaved={() => setMessage("원본 저장을 확인했어요")}
        />
      )}
    </>
  );
}
