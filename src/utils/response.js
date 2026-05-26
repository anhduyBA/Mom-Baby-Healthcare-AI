export const sendSuccess = (res, data, message = "Success") => {
  return res.json({ success: true, message, data });
};

export const sendError = (res, status = 500, message = "Internal Server Error", error = null) => {
  const payload = { success: false, message };
  if (error) payload.error = error;
  return res.status(status).json(payload);
};
