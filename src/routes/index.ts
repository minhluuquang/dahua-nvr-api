import { registerHealthRoutes } from "./health";
import { registerAuthRoutes } from "./auth";
import { registerCameraRoutes } from "./cameras";
import { registerRpcRoutes } from "./rpc";

/**
 * Register all routes with the app
 */
export function registerRoutes() {
  registerHealthRoutes();
  registerAuthRoutes();
  registerCameraRoutes();
  registerRpcRoutes();
}
