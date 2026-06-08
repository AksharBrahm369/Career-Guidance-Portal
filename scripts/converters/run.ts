import { convertTextCsv } from "./aptitude-text-csv";
import { convertFigural } from "./aptitude-figural";

const [, , cmd, ...args] = process.argv;

function usage(): never {
  console.error(
    [
      "Usage:",
      "  tsx scripts/converters/run.ts text <csvPath> <outPath>",
      "  tsx scripts/converters/run.ts figural <manifestCsv> <imagesDir> <source> <outPath>",
    ].join("\n"),
  );
  process.exit(1);
}

try {
  if (cmd === "text") {
    const [csvPath, outPath] = args;
    if (!csvPath || !outPath) usage();
    convertTextCsv(csvPath, outPath);
  } else if (cmd === "figural") {
    const [manifestPath, imagesDir, source, outPath] = args;
    if (!manifestPath || !imagesDir || !source || !outPath) usage();
    convertFigural(manifestPath, imagesDir, source, outPath);
  } else {
    usage();
  }
} catch (err) {
  console.error("✗", err instanceof Error ? err.message : String(err));
  process.exit(1);
}
