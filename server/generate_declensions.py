#!/usr/bin/env python3
"""
Generate authoritative Sanskrit declension data using Vidyut (Paninian engine).

Usage:
    python generate_declensions.py                    # Generate all stems → server/data/declensions/
    python generate_declensions.py --stem rAma --linga pum   # Single stem test
    python generate_declensions.py --bundle 500       # Also create bundled top-N JSON for extension

Output:
    server/data/declensions/{stem}_{linga}.json   — one file per stem+gender
    server/data/declensions/_index.json           — master index of all generated stems
    extension/data/declensions-bundle.json        — bundled top-N for offline use (with --bundle)
"""

import argparse
import json
import os
import sys
import time

from vidyut.prakriya import (
    Vyakarana, Pratipadika, Pada,
    Linga, Vibhakti, Vacana,
)
from vidyut.lipi import transliterate, Scheme

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VIBHAKTI_META = [
    (Vibhakti.Prathama,   "prathamā",   "प्रथमा",   "Nominative"),
    (Vibhakti.Dvitiya,    "dvitīyā",    "द्वितीया",  "Accusative"),
    (Vibhakti.Trtiya,     "tṛtīyā",     "तृतीया",   "Instrumental"),
    (Vibhakti.Caturthi,   "caturthī",   "चतुर्थी",  "Dative"),
    (Vibhakti.Panchami,   "pañcamī",    "पञ्चमी",   "Ablative"),
    (Vibhakti.Sasthi,     "ṣaṣṭhī",     "षष्ठी",    "Genitive"),
    (Vibhakti.Saptami,    "saptamī",    "सप्तमी",   "Locative"),
    (Vibhakti.Sambodhana, "sambodhana", "सम्बोधन",  "Vocative"),
]

VACANA_META = [
    (Vacana.Eka,  "eka",  "एकवचन",   "Singular"),
    (Vacana.Dvi,  "dvi",  "द्विवचन",  "Dual"),
    (Vacana.Bahu, "bahu", "बहुवचन",  "Plural"),
]

LINGA_MAP = {
    "pum":       Linga.Pum,
    "stri":      Linga.Stri,
    "napumsaka": Linga.Napumsaka,
}

LINGA_LABELS = {
    "pum":       {"key": "pum",       "sa": "पुल्लिङ्ग",     "en": "Masculine"},
    "stri":      {"key": "stri",      "sa": "स्त्रीलिङ्ग",    "en": "Feminine"},
    "napumsaka": {"key": "napumsaka", "sa": "नपुंसकलिङ्ग",  "en": "Neuter"},
}

# ---------------------------------------------------------------------------
# Common Sanskrit stems — curated from frequency in classical texts
# Format: (slp1_stem, linga_key, category)
#
# Sources:
#   - Monier-Williams most common headwords
#   - Digital Corpus of Sanskrit frequency lists
#   - Standard paradigm examples from grammar textbooks
# ---------------------------------------------------------------------------

STEM_LIST = [
    # --- a-stem masculine (अ-कारान्त पुल्लिङ्ग) ---
    ("rAma",     "pum",       "a_masc"),
    ("deva",     "pum",       "a_masc"),
    ("nara",     "pum",       "a_masc"),
    ("bAla",     "pum",       "a_masc"),
    ("vfkza",    "pum",       "a_masc"),
    ("grAma",    "pum",       "a_masc"),
    ("loka",     "pum",       "a_masc"),
    ("Darma",    "pum",       "a_masc"),
    ("yoga",     "pum",       "a_masc"),
    ("kAla",     "pum",       "a_masc"),
    ("mArga",    "pum",       "a_masc"),
    ("Atman",    "pum",       "an_masc"),   # actually an-stem, listed below too
    ("putra",    "pum",       "a_masc"),
    ("sUrya",    "pum",       "a_masc"),
    ("candra",   "pum",       "a_masc"),
    ("arjuna",   "pum",       "a_masc"),
    ("kfzRa",    "pum",       "a_masc"),
    ("aSva",     "pum",       "a_masc"),
    ("gaja",     "pum",       "a_masc"),
    ("guru",     "pum",       "u_masc"),    # actually u-stem, recategorized below

    # --- a-stem neuter (अ-कारान्त नपुंसकलिङ्ग) ---
    ("Pala",     "napumsaka", "a_neut"),
    ("vana",     "napumsaka", "a_neut"),
    ("jala",     "napumsaka", "a_neut"),
    ("Dana",     "napumsaka", "a_neut"),
    ("sukha",    "napumsaka", "a_neut"),
    ("duHKa",    "napumsaka", "a_neut"),
    ("pApa",     "napumsaka", "a_neut"),
    ("puRya",    "napumsaka", "a_neut"),
    ("kArya",    "napumsaka", "a_neut"),
    ("SAstra",   "napumsaka", "a_neut"),

    # --- ā-stem feminine (आ-कारान्त स्त्रीलिङ्ग) ---
    ("ramA",     "stri",      "aa_fem"),
    ("sItA",     "stri",      "aa_fem"),
    ("vidyA",    "stri",      "aa_fem"),
    ("latA",     "stri",      "aa_fem"),
    ("kaTA",     "stri",      "aa_fem"),
    ("mAlA",     "stri",      "aa_fem"),
    ("senA",     "stri",      "aa_fem"),
    ("gaNgA",    "stri",      "aa_fem"),
    ("BAzA",     "stri",      "aa_fem"),
    ("dayA",     "stri",      "aa_fem"),

    # --- i-stem masculine (इ-कारान्त पुल्लिङ्ग) ---
    ("kavi",     "pum",       "i_masc"),
    ("muni",     "pum",       "i_masc"),
    ("fzi",      "pum",       "i_masc"),
    ("hari",     "pum",       "i_masc"),
    ("ravi",     "pum",       "i_masc"),
    ("aDipati",  "pum",       "i_masc"),
    ("agni",     "pum",       "i_masc"),
    ("pati",     "pum",       "i_masc"),

    # --- i-stem feminine (इ-कारान्त स्त्रीलिङ्ग) ---
    ("mati",     "stri",      "i_fem"),
    ("gati",     "stri",      "i_fem"),
    ("Bukti",    "stri",      "i_fem"),
    ("Sakti",    "stri",      "i_fem"),
    ("Santi",    "stri",      "i_fem"),
    ("kIrti",    "stri",      "i_fem"),
    ("BUmi",     "stri",      "i_fem"),
    ("rAtri",    "stri",      "i_fem"),

    # --- i-stem neuter (इ-कारान्त नपुंसकलिङ्ग) ---
    ("vAri",     "napumsaka", "i_neut"),
    ("asTi",     "napumsaka", "i_neut"),
    ("akzi",     "napumsaka", "i_neut"),

    # --- u-stem masculine (उ-कारान्त पुल्लिङ्ग) ---
    ("guru",     "pum",       "u_masc"),
    ("BAnu",     "pum",       "u_masc"),
    ("Sazu",     "pum",       "u_masc"),
    ("ripu",     "pum",       "u_masc"),
    ("paSu",     "pum",       "u_masc"),
    ("vizvRu",   "pum",       "u_masc"),
    ("taru",     "pum",       "u_masc"),

    # --- u-stem neuter (उ-कारान्त नपुंसकलिङ्ग) ---
    ("maDu",     "napumsaka", "u_neut"),
    ("vastu",    "napumsaka", "u_neut"),
    ("Denu",     "napumsaka", "u_neut"),

    # --- ī-stem feminine (ई-कारान्त स्त्रीलिङ्ग) ---
    ("nadI",     "stri",      "ii_fem"),
    ("devI",     "stri",      "ii_fem"),
    ("lakzmI",   "stri",      "ii_fem"),
    ("nArI",     "stri",      "ii_fem"),
    ("strI",     "stri",      "ii_fem"),
    ("BaginI",   "stri",      "ii_fem"),

    # --- ū-stem feminine (ऊ-कारान्त स्त्रीलिङ्ग) ---
    ("vaDU",     "stri",      "uu_fem"),
    ("camU",     "stri",      "uu_fem"),
    ("BU",       "stri",      "uu_fem"),

    # --- ṛ-stem masculine (ऋ-कारान्त पुल्लिङ्ग — agent nouns) ---
    ("kartf",    "pum",       "r_masc"),
    ("Bartf",    "pum",       "r_masc"),
    ("dAtf",     "pum",       "r_masc"),
    ("DArf",     "pum",       "r_masc"),
    ("netf",     "pum",       "r_masc"),

    # --- ṛ-stem feminine (ऋ-कारान्त स्त्रीलिङ्ग — kinship) ---
    ("mAtf",     "stri",      "r_fem"),
    ("duhitf",   "stri",      "r_fem"),
    ("svasf",    "stri",      "r_fem"),

    # --- an-stem masculine (अन्-कारान्त पुल्लिङ्ग) ---
    ("rAjan",    "pum",       "an_masc"),
    ("Atman",    "pum",       "an_masc"),
    ("brahman",  "pum",       "an_masc"),

    # --- an-stem neuter ---
    ("nAman",    "napumsaka", "an_neut"),
    ("karman",   "napumsaka", "an_neut"),

    # --- s-stem neuter (स्-कारान्त नपुंसकलिङ्ग) — very common ---
    ("manas",    "napumsaka", "s_neut"),
    ("tapas",    "napumsaka", "s_neut"),
    ("tejas",    "napumsaka", "s_neut"),
    ("yajas",    "napumsaka", "s_neut"),
    ("Siras",    "napumsaka", "s_neut"),
    ("vacas",    "napumsaka", "s_neut"),
    ("cetas",    "napumsaka", "s_neut"),

    # --- in-stem masculine (इन्-कारान्त पुल्लिङ्ग) ---
    ("yogin",    "pum",       "in_masc"),
    ("Danin",    "pum",       "in_masc"),
    ("BAgin",    "pum",       "in_masc"),
    ("svAmin",   "pum",       "in_masc"),
    ("pakzin",   "pum",       "in_masc"),

    # --- at/ant-stem masculine (present participle stems) ---
    ("Bavat",    "pum",       "at_masc"),
    ("gacCat",   "pum",       "at_masc"),

    # --- mat/vat-stem masculine (possessive) ---
    ("Bagavat",  "pum",       "vat_masc"),
    ("Balavat",  "pum",       "vat_masc"),
    ("Danavat",  "pum",       "vat_masc"),

    # --- Pronouns (sarvanāma) ---
    ("asmad",    "pum",       "pronoun"),
    ("yuzmad",   "pum",       "pronoun"),
    ("tad",      "pum",       "pronoun"),
    ("tad",      "stri",      "pronoun"),
    ("tad",      "napumsaka", "pronoun"),
    ("idam",     "pum",       "pronoun"),
    ("idam",     "stri",      "pronoun"),
    ("idam",     "napumsaka", "pronoun"),
    ("kim",      "pum",       "pronoun"),
    ("kim",      "stri",      "pronoun"),
    ("kim",      "napumsaka", "pronoun"),
    ("etad",     "pum",       "pronoun"),
    ("etad",     "stri",      "pronoun"),
    ("etad",     "napumsaka", "pronoun"),
]


def generate_paradigm(vyakarana, slp1_stem, linga_key):
    """Generate a complete 8×3 paradigm table for a stem + gender."""
    linga = LINGA_MAP[linga_key]
    stem = Pratipadika.basic(slp1_stem)

    stem_deva = transliterate(slp1_stem, Scheme.Slp1, Scheme.Devanagari)
    stem_iast = transliterate(slp1_stem, Scheme.Slp1, Scheme.Iast)

    forms = []
    all_forms_flat = []  # for reverse lookup index

    for vib_enum, vib_iast, vib_sa, vib_en in VIBHAKTI_META:
        row = {
            "vibhakti": {
                "key": vib_iast,
                "sa": vib_sa,
                "en": vib_en,
            },
            "forms": {},
        }
        for vac_enum, vac_key, vac_sa, vac_en in VACANA_META:
            prakriyas = vyakarana.derive(Pada.Subanta(
                pratipadika=stem,
                linga=linga,
                vibhakti=vib_enum,
                vacana=vac_enum,
            ))
            if prakriyas:
                slp1_form = prakriyas[0].text
                deva_form = transliterate(slp1_form, Scheme.Slp1, Scheme.Devanagari)
                iast_form = transliterate(slp1_form, Scheme.Slp1, Scheme.Iast)
                row["forms"][vac_key] = {
                    "deva": deva_form,
                    "iast": iast_form,
                    "slp1": slp1_form,
                }
                all_forms_flat.append({
                    "deva": deva_form,
                    "slp1": slp1_form,
                    "vibhakti": vib_iast,
                    "vacana": vac_key,
                })
            else:
                row["forms"][vac_key] = None
        forms.append(row)

    return {
        "stem": {
            "slp1": slp1_stem,
            "deva": stem_deva,
            "iast": stem_iast,
        },
        "linga": LINGA_LABELS[linga_key],
        "vibhaktis": forms,
        "all_forms": all_forms_flat,
    }


def build_reverse_index(all_paradigms):
    """Build inflected_form → stem+position lookup for the extension."""
    index = {}
    for paradigm in all_paradigms:
        stem_info = {
            "stem_slp1": paradigm["stem"]["slp1"],
            "stem_deva": paradigm["stem"]["deva"],
            "linga": paradigm["linga"]["key"],
        }
        for form_entry in paradigm["all_forms"]:
            deva = form_entry["deva"]
            if deva not in index:
                index[deva] = []
            index[deva].append({
                **stem_info,
                "vibhakti": form_entry["vibhakti"],
                "vacana": form_entry["vacana"],
            })
    return index


def main():
    parser = argparse.ArgumentParser(description="Generate Sanskrit declension data using Vidyut")
    parser.add_argument("--stem", help="Single SLP1 stem to generate (for testing)")
    parser.add_argument("--linga", choices=["pum", "stri", "napumsaka"], help="Gender for --stem")
    parser.add_argument("--bundle", type=int, default=0,
                        help="Also create a bundled JSON of top N stems for the extension")
    parser.add_argument("--outdir", default=None,
                        help="Output directory (default: server/data/declensions/)")
    args = parser.parse_args()

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if args.outdir:
        outdir = args.outdir
    else:
        outdir = os.path.join(project_root, "server", "data", "declensions")
    os.makedirs(outdir, exist_ok=True)

    v = Vyakarana()

    # Single stem mode (for testing)
    if args.stem:
        if not args.linga:
            print("Error: --linga required with --stem", file=sys.stderr)
            sys.exit(1)
        paradigm = generate_paradigm(v, args.stem, args.linga)
        print(json.dumps(paradigm, ensure_ascii=False, indent=2))
        return

    # Full generation mode
    print(f"Generating declensions for {len(STEM_LIST)} stem entries...")
    start = time.time()

    all_paradigms = []
    index_entries = []
    seen = set()
    errors = []

    for i, (slp1_stem, linga_key, category) in enumerate(STEM_LIST):
        dedup_key = f"{slp1_stem}_{linga_key}"
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        try:
            paradigm = generate_paradigm(v, slp1_stem, linga_key)
            all_paradigms.append(paradigm)

            # Write individual file
            filename = f"{slp1_stem}_{linga_key}.json"
            filepath = os.path.join(outdir, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(paradigm, f, ensure_ascii=False, indent=2)

            index_entries.append({
                "file": filename,
                "stem_slp1": slp1_stem,
                "stem_deva": paradigm["stem"]["deva"],
                "stem_iast": paradigm["stem"]["iast"],
                "linga": linga_key,
                "category": category,
            })

            stem_deva = paradigm["stem"]["deva"]
            print(f"  [{i+1}/{len(STEM_LIST)}] {stem_deva} ({linga_key}) → {filename}")

        except Exception as e:
            errors.append((slp1_stem, linga_key, str(e)))
            print(f"  [{i+1}/{len(STEM_LIST)}] ERROR: {slp1_stem} ({linga_key}): {e}")

    # Write master index
    index_path = os.path.join(outdir, "_index.json")
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index_entries, f, ensure_ascii=False, indent=2)
    print(f"\nIndex written: {index_path} ({len(index_entries)} entries)")

    # Write reverse lookup index
    reverse_index = build_reverse_index(all_paradigms)
    reverse_path = os.path.join(outdir, "_reverse_lookup.json")
    with open(reverse_path, "w", encoding="utf-8") as f:
        json.dump(reverse_index, f, ensure_ascii=False)
    print(f"Reverse lookup: {reverse_path} ({len(reverse_index)} unique forms)")

    # Bundle for extension
    if args.bundle > 0:
        bundle_count = min(args.bundle, len(all_paradigms))
        bundle = all_paradigms[:bundle_count]
        # Strip all_forms from bundle to reduce size (extension uses vibhaktis for display)
        for p in bundle:
            del p["all_forms"]
        bundle_path = os.path.join(project_root, "extension", "data", "declensions-bundle.json")
        with open(bundle_path, "w", encoding="utf-8") as f:
            json.dump(bundle, f, ensure_ascii=False)
        bundle_size = os.path.getsize(bundle_path)
        print(f"Extension bundle: {bundle_path} ({bundle_count} paradigms, {bundle_size/1024:.1f} KB)")

    elapsed = time.time() - start
    print(f"\nDone in {elapsed:.2f}s. {len(index_entries)} paradigms generated, {len(errors)} errors.")

    if errors:
        print("\nErrors:")
        for stem, linga, err in errors:
            print(f"  {stem} ({linga}): {err}")


if __name__ == "__main__":
    main()
