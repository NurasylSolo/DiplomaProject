"""Apply Claude-as-second-annotator TP/FP verdicts to dedup_sample.csv.

DISCLAIMER (same as for sentiment): annotation done by Claude, not human.
Methodology section must disclose this.

How I decided per cluster:
  TP — articles in the cluster are clearly about the same story / event
       (same incident, same press release, same syndicated piece across
       multiple wire-service outlets). Re-publications of the same content
       count as TP even if titles differ slightly.
  FP — articles in the cluster are unrelated. Common failure modes I saw:
       (a) lifedon.info / themanc.com articles get clustered because their
           snippets contain sidebar / related-article text that overlaps
           across many unrelated pieces;
       (b) dealnews.com / slickdeals adidas product listings get clustered
           because the boilerplate language (promo code MARCH/EXCLUSIVE,
           free shipping, adiClub) is repeated across listings of
           DIFFERENT products.
"""
import csv
import os

CSV_PATH = os.path.join("eval_out", "dedup_sample.csv")

# True/False positive verdict per cluster_id.
VERDICTS = {
    "e2a78cab2a15f79ad918ee0188e1e49c": "TP",  # 01 Sudbury pub stabbing
    "99a0ab1399aab19d774866a867211a47": "TP",  # 02 Amazon Big Spring deals (syndicated)
    "69f04e8d5f123aa53be5f27e6fd85636": "FP",  # 03 Stella McCartney H&M vs Manchester Marathon faces — unrelated
    "45c4842e1ab2e21446a61b8774dd3d4d": "TP",  # 04 Nike China Problem (same article)
    "9fdcec6fc68e6eb5bff4731a25a794a3": "TP",  # 05 Ex-Adidas exec lawsuit (syndicated)
    "516be0ec688e1ff53ad0cb9901d47ce3": "FP",  # 06 Three different adidas deals — same source/brand, different products
    "ac53e2b5c706bd6181bc2a0962bded49": "FP",  # 07 Sneaker trend vs Masters fashion guide — unrelated
    "689d9ae064e1fda3ba60b9aac5dd3a67": "TP",  # 08 European Stocks Strong (RTTNews syndicated)
    "74d2a13ac61269f12d4f3f3ebc7ec80d": "TP",  # 09 модные мужские кроссовки 2026 (same story two outlets)
    "4624d5ad752e15a9156e9d73bf478ae5": "FP",  # 10 themanc.com — marathon freebies + Uniqlo + coach — different stories
    "dad71d740aafc261a1e180543759820e": "TP",  # 11 Канье Уэст карьера (same article)
    "fd41a4bfb1d5d056bb0f4fe4a036ff9f": "TP",  # 12 Adidas Shanghai retro market (same fashionunited article)
    "e1dc28d549a5d2e0c815654eb2003d9f": "TP",  # 13 Big Spring Sale under $50 (syndicated McClatchy)
    "684c2b90affc7aa246d0df6f3e5c224e": "FP",  # 14 lifedon.info — gas/smartphones/eggs all different topics
    "5c652d379d2b980554cd8cccd4e252f0": "TP",  # 15 UMass basketball Jordan Clayton (syndicated)
    "c789a79f56f2ea3e8b89f67509e10361": "TP",  # 16 Search for missing teenager Lily
    "5d8e8ef1b643925c830dc351d663fd9d": "TP",  # 17 DAX Up Nearly 1% (RTTNews syndicated)
    "171cb51c0c79f968518c0a5f30a15fd2": "TP",  # 18 Style polka dots (same article 3 URLs)
    "96c988e504ec51fafd91962652204113": "FP",  # 19 adidas Samba deals vs general shoe deals — different listings
    "eded74ba0ae6f7cb571282e0ebf7d2f4": "TP",  # 20 Courteney Cox Adilette slides (yahoo+ca.yahoo)
    "bfad2fec2ffd45ab87e0b431cf541097": "FP",  # 21 Columbia shorts vs Under Armour shorts — different products
    "2e6856d1289ecc9e175f67efe322a924": "TP",  # 22 Oodie football coats final reduction (syndicated reach)
    "b9aec8f01ee8f547f64408310b730644": "FP",  # 23 J.Lawrence slides vs adidas Superstar Made-in-Italy — different
    "d88a368eb4a5a493e82de13263ea8f0f": "FP",  # 24 lifedon.info — herring/pension/gas different stories
    "dac7560a60aa01704f7418cd308c76ad": "TP",  # 25 Amazon Big Spring under $50 (BestReviews syndicated)
    "830209a1f3e4741d87ad8823ee544cc5": "FP",  # 26 adidas leggings vs adidas kids polo — different listings
    "6998f68df54b7ce937ac48f4100c6bb4": "FP",  # 27 lifedon.info — hryvnia/skin/apple different stories
    "60e71615e3a89e0b5115b16f24b6bbbf": "FP",  # 28 Adam Wharton vs NBA podcasts vs Under Armour — unrelated
    "793acf833e840faa8fc3b8347e487ef3": "FP",  # 29 Short Takes (Eleventy/Steelers/Adidas) vs NYT fashion history
    "05e9e98b46fa3046c3cb39f9b3596d50": "FP",  # 30 Runfalcon vs VL Court vs S2G golf — different shoe listings
    "75370d596d686162e64401e0e54abf63": "TP",  # 31 Judge halts sentencing 26 dates of birth (same case)
    "c2d5a5497fc0ab75d3176de14a30104a": "FP",  # 32 different adidas deal pages
    "48b0fd20135555c027c1605f98a1e1c1": "FP",  # 33 Terrex Anylander vs LOVB Spezialist vs GS II SPZL — different shoes
    "7f1c4bc7758a9a73d4235d0871d5341e": "TP",  # 34 Liverpool transfer target (yahoo+ca.yahoo)
    "6b71fe366d0e7e1facd78c98257813f4": "TP",  # 35 Nike China stumble (Reuters syndicated)
    "215f9817a87d89efccd8f9907aef38ac": "TP",  # 36 Nike+Adidas SoHo (same wwd article http vs https)
    "6c07dcca365e5e0bdf455f3540a8fd0f": "TP",  # 37 Steph Curry sneaker free agency
    "0794f23bb80bca0d0522f0bef63cc6dc": "TP",  # 38 Nike removes Boston Marathon ad (syndicated)
    "c61452298eca67687efd2ff1c191b65d": "TP",  # 39 Sunglass Hut Cotswolds Outlet
    "c3ebca94bb0744c01d5fd7f9b1e3380f": "TP",  # 40 DAX Down Marginally (RTTNews)
    "40b43eaadba7dd7c214acc7df323cf3d": "TP",  # 41 Footasylum Manchester Arndale (regional fashionnetwork)
    "b737b19e7b38999805e32efffb72dc61": "TP",  # 42 autosport.com.ru same article, two URL/title variants
    "03ae3464ce28a3247eeed7f434a4cc96": "TP",  # 43 S&P Nike forecast (McClatchy syndicated)
    "dc268e87307214d32ad5d352e3cb7fd8": "TP",  # 44 European markets firm despite war (RTTNews)
    "bd23d971bdb5c7a29d8ce2ed43162120": "TP",  # 45 Sudbury White Horse stabbing (3 outlets, may overlap with cluster 01)
    "13e1180b05fad10fce4921ae4e0abe21": "TP",  # 46 Эйфория careers (same article, different domains)
}

assert len(VERDICTS) == 46, f"Expected 46 verdicts, got {len(VERDICTS)}"


def main() -> None:
    with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
        fieldnames = list(rows[0].keys())

    seen_clusters: set[str] = set()
    for r in rows:
        cid = r["cluster_id"]
        # Only set verdict on the first row per cluster (analyzer reads
        # the first non-empty verdict per cluster).
        if cid not in seen_clusters:
            r["verdict_TP_or_FP"] = VERDICTS.get(cid, "")
            seen_clusters.add(cid)

    with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(rows)

    tp = sum(1 for v in VERDICTS.values() if v == "TP")
    fp = sum(1 for v in VERDICTS.values() if v == "FP")
    prec = tp / (tp + fp)
    print(f"Wrote verdicts for {len(VERDICTS)} clusters")
    print(f"TP={tp}  FP={fp}  precision={prec:.4f}")


if __name__ == "__main__":
    main()
