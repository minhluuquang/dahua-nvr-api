import { registerHealthRoutes } from "./health";
import { registerAuthRoutes } from "./auth";
import { registerCameraRoutes } from "./cameras";
import { registerRpcRoutes } from "./rpc";
import { registerStreamRoutes } from "./streams";

/**
 * Register all routes with the app
 */
export function registerRoutes() {
  registerHealthRoutes();
  registerAuthRoutes();
  registerCameraRoutes();
  registerRpcRoutes();
  registerStreamRoutes();
}
