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
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as boards from "../boards.js";
import type * as cards from "../cards.js";
import type * as columns from "../columns.js";
import type * as comments from "../comments.js";
import type * as http from "../http.js";
import type * as joinRequests from "../joinRequests.js";
import type * as labels from "../labels.js";
import type * as lib_auth from "../lib/auth.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as typing from "../typing.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  analytics: typeof analytics;
  auth: typeof auth;
  boards: typeof boards;
  cards: typeof cards;
  columns: typeof columns;
  comments: typeof comments;
  http: typeof http;
  joinRequests: typeof joinRequests;
  labels: typeof labels;
  "lib/auth": typeof lib_auth;
  messages: typeof messages;
  notifications: typeof notifications;
  typing: typeof typing;
  users: typeof users;
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
