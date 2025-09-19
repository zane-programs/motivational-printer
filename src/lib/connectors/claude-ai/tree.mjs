export function constructTree(fullData) {
  let { chat_messages, current_leaf_message_uuid } = fullData;

  const uuidsToIndicesMap = Object.fromEntries(
    chat_messages.map((msg, idx) => [msg.uuid, idx])
  );

  const allMessages = [];
  let startingMessage =
    chat_messages[uuidsToIndicesMap[current_leaf_message_uuid]];

  if (!startingMessage) return allMessages;

  while (true) {
    if (!startingMessage?.parent_message_uuid) break;
    allMessages.unshift(startingMessage);
    startingMessage =
      chat_messages[uuidsToIndicesMap[startingMessage.parent_message_uuid]];
  }

  return allMessages;
}

export function formatMessages(treedMessages) {
  return treedMessages.map((msg) => {
    const { uuid, sender: role } = msg;
    const created_at = new Date(msg.created_at);
    const updated_at = new Date(msg.updated_at);

    if (msg.text) {
      return {
        role,
        text: msg.text.trim(),
        created_at,
        updated_at,
        uuid,
      };
    }

    let text = "";

    if (msg.attachments) {
      text += msg.attachments.map((att) => att.extracted_content).join("\n\n");
    }

    if (msg.content) {
      text += msg.content
        .filter((cont) => cont.type === "text")
        .map((cont) => cont.text)
        .join("\n\n");
    }

    text = text.trim();

    return { role, text, created_at, updated_at, uuid };
  });
}
