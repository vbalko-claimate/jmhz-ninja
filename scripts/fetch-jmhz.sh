#!/usr/bin/env bash
set -euo pipefail

# Fetches the current JMHZ XSD, data dictionary, guidelines and example XMLs
# from developers.mpsv.cz into vendor/jmhz/ (gitignored).
#
# Re-run when ČSSZ publishes a new version. After update, regenerate types
# (if used) and re-run `pnpm test` to validate the XML builder against samples.

VENDOR=${VENDOR:-vendor/jmhz}
mkdir -p "$VENDOR/xsd" "$VENDOR/docs" "$VENDOR/examples"

dl() {
  local url=$1 out=$2
  echo "→ $out"
  curl -fL --silent --show-error "$url" -o "$out"
}

dl "https://developers.mpsv.cz/assets/documents/71d47c9e-15de-471d-b7a2-88e7127b17a1/JMHZ_podani_1_4_3_4_xsd.zip" "$VENDOR/xsd/JMHZ_podani_1_4_3_4_xsd.zip"
dl "https://developers.mpsv.cz/assets/documents/aa9a7c75-ca22-4829-93d6-8728bcf251b5/datovy_slovnik_1.4.1.5.xlsx" "$VENDOR/docs/datovy_slovnik_1.4.1.5.xlsx"
dl "https://developers.mpsv.cz/assets/documents/de5f019a-612a-417c-bf1d-006c4ea8a908/MH%20-%20Pokyny%20k%20vyplneni%20mesicniho%20hlaseni_1.4.13.pdf" "$VENDOR/docs/MH_pokyny_1.4.13.pdf"
dl "https://developers.mpsv.cz/assets/documents/b943292b-9e28-40eb-9ef0-309605fdef85/Priklady%20XML%20-%20REGZEC_REGZEL-DOPL_JMHZ_DZMH_2026-04-13.zip" "$VENDOR/examples/priklady_xml_2026-04-13.zip"

echo
echo "Extracting ZIPs..."
unzip -oq "$VENDOR/xsd/JMHZ_podani_1_4_3_4_xsd.zip" -d "$VENDOR/xsd/"
unzip -oq "$VENDOR/examples/priklady_xml_2026-04-13.zip" -d "$VENDOR/examples/"

echo "Done. Files in $VENDOR/"
ls -la "$VENDOR/xsd/" "$VENDOR/examples/" "$VENDOR/docs/"
