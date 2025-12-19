export class Student {
  id?: number;
  name?: string;
  email?: string;
  gender?: string;
}


export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}