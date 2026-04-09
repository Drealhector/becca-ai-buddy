/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as ai from "../ai.js";
import type * as aiTools from "../aiTools.js";
import type * as botConfig from "../botConfig.js";
import type * as botPersonality from "../botPersonality.js";
import type * as businessKeys from "../businessKeys.js";
import type * as callHistory from "../callHistory.js";
import type * as callers from "../callers.js";
import type * as channelHandler from "../channelHandler.js";
import type * as connections from "../connections.js";
import type * as contacts from "../contacts.js";
import type * as conversations from "../conversations.js";
import type * as crons from "../crons.js";
import type * as customerInteractions from "../customerInteractions.js";
import type * as customizations from "../customizations.js";
import type * as deals from "../deals.js";
import type * as escalationRequests from "../escalationRequests.js";
import type * as http from "../http.js";
import type * as leads from "../leads.js";
import type * as messages from "../messages.js";
import type * as products from "../products.js";
import type * as properties from "../properties.js";
import type * as scheduledCalls from "../scheduledCalls.js";
import type * as seedProperties from "../seedProperties.js";
import type * as storage from "../storage.js";
import type * as syncCalls from "../syncCalls.js";
import type * as toggles from "../toggles.js";
import type * as transcripts from "../transcripts.js";
import type * as voice from "../voice.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  ai: typeof ai;
  aiTools: typeof aiTools;
  botConfig: typeof botConfig;
  botPersonality: typeof botPersonality;
  businessKeys: typeof businessKeys;
  callHistory: typeof callHistory;
  callers: typeof callers;
  channelHandler: typeof channelHandler;
  connections: typeof connections;
  contacts: typeof contacts;
  conversations: typeof conversations;
  crons: typeof crons;
  customerInteractions: typeof customerInteractions;
  customizations: typeof customizations;
  deals: typeof deals;
  escalationRequests: typeof escalationRequests;
  http: typeof http;
  leads: typeof leads;
  messages: typeof messages;
  products: typeof products;
  properties: typeof properties;
  scheduledCalls: typeof scheduledCalls;
  seedProperties: typeof seedProperties;
  storage: typeof storage;
  syncCalls: typeof syncCalls;
  toggles: typeof toggles;
  transcripts: typeof transcripts;
  voice: typeof voice;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
