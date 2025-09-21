const { Op } = require("sequelize");

/**
 * Pagination + search + sorting helper
 * @param {Object} model Sequelize model
 * @param {Object} query Request query params (req.query)
 * @param {Object} options Query options tambahan (where, include, dll.)
 * @param {Array} searchableFields Daftar kolom yang bisa dicari (LIKE)
 */
async function paginate(model, query = {}, options = {}, searchableFields = []) {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  // --- Search ---
  let where = options.where || {};
  if (query.search && searchableFields.length > 0) {
    const searchValue = `%${query.search}%`;
    where = {
      ...where,
      [Op.or]: searchableFields.map((field) => ({
        [field]: { [Op.like]: searchValue }, // pakai Op.like kalau MySQL
      })),
    };
  }

  // --- Ordering ---
  let order = options.order || [];
  if (query.sortBy) {
    const sortOrder = query.order && query.order.toUpperCase() === "ASC" ? "ASC" : "DESC";
    order = [[query.sortBy, sortOrder]];
  }

  const { count, rows } = await model.findAndCountAll({
    ...options,
    where,
    order,
    limit,
    offset,
  });

  return {
    data: rows,
    meta: {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      pageSize: limit,
      hasNextPage: page < Math.ceil(count / limit),
      hasPreviousPage: page > 1,
    },
  };
}

module.exports = paginate;
