"""Apply Claude-as-second-annotator labels back into sentiment_sample.csv.

CRITICAL DISCLAIMER:
These labels were assigned by Claude (Anthropic's LLM), NOT by a human
evaluator. The agreement rate / Cohen's kappa numbers therefore measure
"GPT-4o-mini vs. Claude" agreement, NOT "model vs. human" agreement —
which is what a thesis writeup typically claims.

If using these numbers in academic work, the methodology section MUST
disclose: "Inter-system agreement was measured between the production
GPT-4o-mini classifier and a Claude (Sonnet/Opus class) cross-checker
acting as the reference annotator. A separate human evaluation was not
performed in this run."
"""
import csv
import os

CSV_PATH = os.path.join("eval_out", "sentiment_sample.csv")

# Labels keyed by mention_id, in the same order they appeared in the file.
# Annotation rules I followed:
#   - Judge sentiment of the article TEXT (title + snippet), not of the
#     subject. A factual report of bad news is reported NEGATIVE.
#   - Pure announcements / event tickets / "company X did Y" with no
#     evaluative language → NEUTRAL (the production model tends to
#     over-call POSITIVE for these — that's the main source of disagreement).
#   - Deals, sales, success stories, recommendations → POSITIVE.
#   - Lawsuits, missing-persons, criticism, controversy, market drops,
#     mocking-tone coverage → NEGATIVE.
LABELS = {
    "a30ff7f9-bb44-4235-8b9c-a0a99243e1d4": "negative",  # 01 пенсия снижение
    "65b91bdf-c5f1-46a2-9ff7-97f5a47c63a4": "neutral",   # 02 Мбаппе/Nike контракт
    "a759092d-57d5-4302-8f0a-c5dd5e68bd3b": "negative",  # 03 Adidas lawsuit
    "5c997c63-c8a3-46a7-8e08-3be0bdbfa584": "positive",  # 04 Candace Parker invest
    "3e62e3bb-7af7-4ddf-abbf-9dd778325a5e": "positive",  # 05 Adidas 25 kits
    "6f369a8f-9f42-4195-b5bf-83974c75dd07": "neutral",   # 06 УАФ форма (announcement)
    "bb2f79f3-c1c4-4cc8-bac4-5e1115be8a11": "positive",  # 07 9 best duffel bags
    "65d9dfb8-745a-429d-9f84-090abf1dff41": "neutral",   # 08 Belarus relocation (descriptive)
    "2ed47537-211b-4071-b0ea-b37057af72ea": "positive",  # 09 Manchester Marathon charity
    "e6e2afb8-c7bf-411b-bf2f-7c53c9938f22": "positive",  # 10 Ice Spice fortune
    "91d408ce-e656-452e-a660-10ae9a1bc803": "positive",  # 11 Луана Лопес Лара миллиардерша
    "6c126260-3ca4-4247-8dc2-73c219656fb0": "positive",  # 12 Mom 30 Miles sneakers
    "854c608d-87d3-485e-b5b1-4ddca092312f": "positive",  # 13 Terrex deal
    "b830f43d-6c82-49e2-8137-1718ed74231d": "negative",  # 14 Стармер Канье спонсоры уходят
    "0a298a2e-f120-4297-9d9a-a56d81641dff": "negative",  # 15 Nike China problem
    "519a8617-e49f-49a4-9143-9322646a9123": "positive",  # 16 podiatrist shoe picks save 73%
    "f51f8ac8-0d9b-41d8-8709-5b9b5c6a4703": "neutral",   # 17 субсидии украинцам
    "010af569-2ec0-4d91-bf57-af7f9f549fb3": "positive",  # 18 marathon weekend best things
    "b147cc18-c299-49c1-8b8e-be7895297a6f": "positive",  # 19 Adidas Red Bull партнёр
    "cdf8425e-a79b-4309-a380-4810fb2f38e4": "neutral",   # 20 контрафакт пресекли
    "72546ade-c322-4af9-b12c-55a9454eb130": "neutral",   # 21 где купить оригинальные
    "9dfd98a7-36ab-422c-aaa8-9429ee603478": "positive",  # 22 кроссовки в моде
    "936e4ac9-db8d-4902-8e32-b9bd28871535": "positive",  # 23 цены на яйца снизились
    "e9c27a55-ca21-49b1-aa73-04ce528e41b9": "neutral",   # 24 Холанд инвестиции
    "a91d012d-a0db-43c5-9f9f-9d6c73f296ee": "positive",  # 25 Sarah Wolf to Anthropic
    "52edf1f2-03f2-46ed-82e7-b3d16fdca4f9": "negative",  # 26 пропавшая школьница
    "190c6eaa-9049-4ac7-b045-6d6145c72133": "negative",  # 27 Nike China stumble
    "6e6c2b1e-1ee3-467e-a6e4-cacaee9e4649": "positive",  # 28 Adidas recycled ocean plastic
    "9a65b461-2867-42f0-bc8c-e8e72dbfad90": "neutral",   # 29 Puma регистрирует знак
    "20add650-9771-4268-b533-09f8d1e44470": "positive",  # 30 Stan Smith deal $56 (it's a deal)
    "180d61fc-2813-4488-85a0-eeacfbe26b81": "positive",  # 31 Nike SoHo store opens
    "13aa4878-d700-4a9b-8dab-da6833713285": "positive",  # 32 fitness tracker market growth
    "bcf299f2-8909-4ce0-9f13-2e4a078bbcb1": "neutral",   # 33 51% want promotions (data)
    "39997b4d-1049-423d-b8de-7a9ca4af6f2e": "positive",  # 34 8 chic sandals Amazon
    "dfc1d4f6-a1e2-4b8d-be23-6c7ced6ea4ee": "neutral",   # 35 стресс на кожу
    "128ffc39-0fee-4fd1-91f2-3749d6ba2ab6": "positive",  # 36 Adidas x Vhils x Benfica
    "e5878c48-557b-45f2-a3f4-a3ec00a9ef4a": "neutral",   # 37 консервы срок годности
    "7edfbebc-d416-4146-bd1e-b3996415586a": "negative",  # 38 ищут пропавшую (search for missing girl)
    "00aeb515-15ec-400f-9e9f-ea9bd63b0b94": "positive",  # 39 Amazon Big Spring Sale
    "4787d549-a47c-4bfe-9d22-3c5c411defff": "neutral",   # 40 Ротенберг Putin Team (boasting)
    "3402a8d5-85d0-4b37-a8a5-0c1b6d033fdb": "positive",  # 41 GS II SPZL deal
    "7718c20f-04c0-4c6c-ac7c-efbd32daadc8": "neutral",   # 42 Nike+Adidas dueling flagships
    "15a8cda7-2197-42b2-9a76-2f79ebb523e7": "positive",  # 43 MLS 25 Club Ball $8
    "ae952878-0e33-47d5-a979-55f9c56ba0f1": "positive",  # 44 Сеульский марафон
    "8d235d70-03c6-4476-9249-45d5a887d342": "neutral",   # 45 китайский интернет анализ
    "ed4f5178-57ac-4314-8d00-805343c6287f": "positive",  # 46 Adidas Red Bull спонсор
    "73e1adff-f543-4c8f-bfab-5c48f947d555": "positive",  # 47 Skechers comfortable shoes
    "fad4cda1-bd49-4d43-9992-ed72adb2eff8": "positive",  # 48 Pharaoh футбол фанат
    "6445f22c-60d3-429d-b04a-c7f6e20877e8": "negative",  # 49 Adidas lawsuit (dup)
    "ac33ffc2-aa60-4184-a519-2a78feb166bb": "neutral",   # 50 Louis Vuitton сумка лейка
    "0ed4d5f0-5b1a-448f-85bc-5f11cc6b3c6a": "positive",  # 51 Brawl Stars Adidas collab
    "58520006-5573-4302-b62b-03972d7d1164": "positive",  # 52 сгущенка рецепт
    "68ab5b15-e254-404c-bea6-ac207c6b32f1": "negative",  # 53 USA-Belgium jersey eyesore loss
    "eb41407b-0976-4cbe-b9d8-3afcd36983e5": "neutral",   # 54 Lamoda аннуляция сертификатов
    "4106e350-d7a5-4ed4-a11f-9a8f5e4a78e4": "neutral",   # 55 Generation adidas Cup recap
    "bd899c39-7e61-44d9-aa99-375b2395b195": "neutral",   # 56 Dragons coach replacement
    "4550d926-018d-4b6f-806a-06c10d1543fe": "positive",  # 57 модные кроссовки 2026
    "4d1430ec-5add-4e50-8b05-4e55be4fef9f": "positive",  # 58 Under Armour innovation labs
    "99c6323f-1084-4bf8-8162-c816e86d1f7d": "positive",  # 59 adidas Chocolate Spezial
    "d586e42e-57c6-4f22-8d1c-b3a4af5974d7": "positive",  # 60 Pharrell Reebok comeback
    "caff2c98-ceb0-4cfa-96ef-5d1f99ccb05b": "neutral",   # 61 NKE stock fallen but maybe opportunity
    "66b47622-f875-4896-869d-5f8721ba0c38": "positive",  # 62 Adidas best NFL rookie class
    "e833a6ab-5d27-454a-ba1f-5398730a7c97": "neutral",   # 63 беженка Италия lifestyle
    "a2c0944d-c89d-4590-984c-aff9efa5d689": "negative",  # 64 лживый Голливуд проиграл
    "5c1a8052-2f19-4c51-9b8e-da1353ee71c6": "negative",  # 65 F1 как бродяги (mocking)
    "6816c7f5-1996-46eb-aa6d-adc1d9801590": "neutral",   # 66 Ротенберг (boasting again)
    "0cf7e499-23bf-4296-a84a-aec014540f87": "negative",  # 67 Adidas lawsuit (dup)
    "abd46dc4-8631-4971-922d-b48b626839bd": "neutral",   # 68 Ротенберг хоккейные школы
    "e384bb85-54c6-4c8b-a345-b742368c16dd": "positive",  # 69 Gout sets sights (aspires)
    "71c54429-b25d-4951-8a55-8a502ef63403": "neutral",   # 70 гривны замена
    "c98ed3a4-84da-4bca-99e6-83c38a0a877e": "positive",  # 71 adidas Collaborations 45% off
    "d1c16e04-b05a-447f-8350-c7a7ac4e726d": "neutral",   # 72 Adidas opens media account review
    "792b75ec-bf21-4d1e-95dd-b52d4ac1bd7f": "neutral",   # 73 Adidas РФ прибыль от вкладов
    "ab694ab7-699b-4b21-a162-ce6b5f81240a": "negative",  # 74 критика Канье Уэста
    "2554c268-5baf-4d7a-bdb8-8a231e43619b": "negative",  # 75 Adidas lawsuit (dup, model said neutral but article is clearly negative)
    "cac76d80-c4da-40ed-95f1-792a72367002": "positive",  # 76 Adidas прибыль 2 млрд
    "597c34aa-c595-4f58-946c-348b058bd2f7": "neutral",   # 77 Украина jersey setback (minor)
    "6c2e6ae2-4269-4f4b-93d2-b107f4e2f0f8": "neutral",   # 78 магнитная буря прогноз
    "51bb4af3-fa47-41e4-9898-d4820b45d473": "negative",  # 79 Nike pulls controversial ad
    "de15a731-3fde-4785-8918-8cdbaf6eedee": "positive",  # 80 USD 383 Adidas agreement
    "136cc50c-db77-433c-8505-1da53299a344": "positive",  # 81 модные кроссовки 2026 обзор
    "9745d953-456a-41fb-afcf-410d0170ee17": "neutral",   # 82 EuroLeague tickets (announcement)
    "45d76263-4739-4cc2-b15d-2a66257e6688": "positive",  # 83 Tiro Cargo Pants $18
    "b41e0c2c-9ab4-446f-8f28-7ed6607e3e06": "neutral",   # 84 Ротенберг ценности
    "c20483bb-806f-448b-90b1-431d3a910455": "neutral",   # 85 Мила Кунис на матче
    "b2a3fd26-4548-4b1b-a5ed-1ebe57ade30a": "positive",  # 86 Gout the win
    "b6ec5dc4-9444-4318-a8dc-e9531f65a75b": "positive",  # 87 Kohl's spring savings
    "e3a96f7f-bcb8-4aaa-9d3e-cea1979d92d8": "positive",  # 88 урожай яблок tip
    "31808950-a4b1-440c-b579-8c333198c14b": "positive",  # 89 Bluefish $43M raise
    "b0b3e4f5-f45e-4824-8600-d51934177eb0": "neutral",   # 90 four-ounce running shoe race
    "0e42272d-ec83-4083-b9a2-f73a321ba08e": "positive",  # 91 European stocks strong
    "eba72656-3287-483e-a428-c4d4c2d124c6": "positive",  # 92 Wales Bonner sandal wildest
    "73a8baa7-4df6-4b76-8d1c-23afe062906c": "neutral",   # 93 популярные кроссовки рейтинг
    "944bf0e0-2853-4c23-a234-c7b48ba63757": "positive",  # 94 Amazon Spring deals under $50
    "fa4c0223-6d0c-46d9-bd88-323bb1df3d5f": "positive",  # 95 adidas trading up 1.4%
    "3479e56c-919a-45ed-83e1-8870a4011507": "positive",  # 96 Stokes wins MVP
    "a44c9072-a054-499c-846a-7505d68f91bd": "negative",  # 97 Nike removes ad criticism
    "abbf53d4-6ee0-40e0-b5e1-53ad22703d09": "positive",  # 98 Ямаль стиль
    "8f55ccea-f953-4666-af62-57ccfb2ace01": "positive",  # 99 adidas hoodie $15
    "ef14b29c-bed8-4a35-86e0-9a762746bdc9": "positive",  # 100 Ямаль фото стиль
}

assert len(LABELS) == 100, f"Expected 100 labels, got {len(LABELS)}"


def main() -> None:
    with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
        fieldnames = list(rows[0].keys())

    missing = [r["mention_id"] for r in rows if r["mention_id"] not in LABELS]
    if missing:
        raise SystemExit(f"missing labels for: {missing[:5]}... ({len(missing)} total)")

    for r in rows:
        my = LABELS[r["mention_id"]]
        r["your_label"] = my
        r["agree"] = "1" if r["model_label"].strip().lower() == my else "0"
        if r["agree"] == "0":
            r["notes"] = "Claude (second annotator) disagreed with GPT-4o-mini"

    with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(rows)

    n_agree = sum(1 for r in rows if r["agree"] == "1")
    print(f"Wrote {len(rows)} rows; raw agreement = {n_agree}/{len(rows)} = {n_agree/len(rows):.3f}")


if __name__ == "__main__":
    main()
