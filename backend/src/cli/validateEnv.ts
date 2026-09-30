import "dotenv/config";
import { ValidationProfile, validateEnvironment } from "../config/readiness";

const profile = (process.env.VALIDATE_PROFILE || "local") as ValidationProfile;
if (!["local", "testnet", "production"].includes(profile)) {
  throw new Error("VALIDATE_PROFILE must be local, testnet, or production");
}

const issues = validateEnvironment(profile);
if (issues.length) {
  console.error(`Environment validation failed for ${profile}:`);
  for (const issue of issues) console.error(`  ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Environment validation passed for ${profile}.`);
}
