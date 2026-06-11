export type JsonLogicRule = Record<string, unknown>;

declare const jsonLogic: {
  apply: (rule: JsonLogicRule, data?: Record<string, unknown>) => unknown;
};

export default jsonLogic;
