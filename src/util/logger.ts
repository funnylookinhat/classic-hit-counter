import { getConfig } from "@/util/config.ts";
import { Logger } from "@funnylookinhat/logosaurus";

export const logger = new Logger({ minLogLevel: getConfig().LOG_LEVEL });
