import { execSync } from "child_process";

const buildNumber = execSync("git rev-list --count HEAD").toString().trim();
console.log("Build number:", buildNumber);