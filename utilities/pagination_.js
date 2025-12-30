const pagination_ = (query = {}, options = {}) => {
  const {
    defaultLimit = 10,
    maxLimit = 60,
  } = options;

  let page = Number.parseInt(query.page, 10);
  let limit = Number.parseInt(query.limit, 10);

  page = Number.isNaN(page) || page < 1 ? 1 : page;

  if (Number.isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  } else if (limit > maxLimit) {
    limit = maxLimit;
  }

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    hasPrevPage: page > 1,
  };
};

module.exports = {pagination_};
