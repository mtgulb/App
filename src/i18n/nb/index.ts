import { common } from './common.ts';
import { shopping } from './shopping.ts';
import { stock } from './stock.ts';
import { recipes } from './recipes.ts';
import { plan } from './plan.ts';
import { settings } from './settings.ts';
import { misc } from './misc.ts';

export const nb = { ...common, ...shopping, ...stock, ...recipes, ...plan, ...settings, ...misc };
export type Messages = typeof nb;
