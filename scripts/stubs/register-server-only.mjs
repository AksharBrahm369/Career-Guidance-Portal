// Pre-loaded via --import to register the server-only ESM loader stub.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
register("./server-only-loader.mjs", pathToFileURL(import.meta.dirname + "/"));
