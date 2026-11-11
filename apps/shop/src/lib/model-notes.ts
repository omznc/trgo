// The attached-photo and source notes are for the model, not for the user.
const MODEL_NOTE = /\n\n\[(?:Attached photos|Search only on|Tagged listing):[^\]]*\]/g;
export const stripNotes = (text: string) => text.replace(MODEL_NOTE, "");
