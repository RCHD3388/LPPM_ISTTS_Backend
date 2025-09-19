class ApiResponse {
  constructor(success, message, data = null, meta = null) {
    this.success = success;
    this.message = message;
    this.data = data;
    if (meta) this.meta = meta; // bisa dipakai untuk pagination dsb
  }

  static success(message = "Success", data = null, meta = null) {
    return new ApiResponse(true, message, data, meta);
  }

  static error(message = "Error", data = null) {
    return new ApiResponse(false, message, data);
  }
}

module.exports = ApiResponse;
