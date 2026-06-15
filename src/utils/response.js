export const sendSuccess = (res, data = null, message = "Success") => {
  return res.json({
    success: true,
    data: data !== undefined ? data : null,
    message,
    errors: null,
    timestamp: new Date().toISOString()
  });
};

export const sendError = (res, status = 500, message = "Internal Server Error", errors = null) => {
  return res.status(status).json({
    success: false,
    data: null,
    message,
    errors: errors ? (Array.isArray(errors) ? errors : [errors]) : [message],
    timestamp: new Date().toISOString()
  });
};
