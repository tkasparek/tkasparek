const DEFAULT_PAGE_SIZE = 10;

interface ILimitOffset {
    limit: number;
    offset: number;
}

const parsePagination = (queryParams: qs.ParsedQs): ILimitOffset => {
    const limit = queryParams.page_size === undefined ? DEFAULT_PAGE_SIZE : Number(queryParams.page_size);
    if (isNaN(limit)) {
        throw new Error('page_size has to be number');
    }
    const offset =
        ((queryParams.page === undefined ? 1 : Number(queryParams.page)) - 1) *
        (queryParams.page_size === undefined ? DEFAULT_PAGE_SIZE : Number(queryParams.page_size));
    if (isNaN(offset)) {
        throw new Error('page has to be a number');
    }
    return {
        limit,
        offset,
    };
};

interface IMeta {
    total_items: number;
    page: number;
    page_size: number;
}

export { ILimitOffset, IMeta, parsePagination };
