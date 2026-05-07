export type CategoryGroup = {
  name: string;
  isRequired: boolean;
  isExclusive: boolean;
  categories: Category[];
};

export type Category = {
  code: string;
  description: string;
  term: string;
};
