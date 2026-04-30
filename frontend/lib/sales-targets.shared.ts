export type AmTarget = {
  id: number;
  name: string;
  isActive: boolean;
  annualTarget: number;
};

export type CategoryTarget = {
  category: "CSS" | "FCC" | "UNCLASSIFIED";
  target: number;
};

export type SalesTargets = {
  amTargets: AmTarget[];
  categoryTargets: CategoryTarget[];
};
