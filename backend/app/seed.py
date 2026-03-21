"""
Seed script to populate the database with test data.
Run: python -m app.seed
"""
import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone
from app.database import AsyncSessionLocal, engine, Base
from app.models import *
from app.core.security import hash_password


SOURCES_DATA = [
    {"name": "Tengrinews", "type": "news", "base_url": "https://tengrinews.kz", "country": "KZ", "language": "ru", "trust_score": 0.9},
    {"name": "Zakon.kz", "type": "news", "base_url": "https://zakon.kz", "country": "KZ", "language": "ru", "trust_score": 0.85},
    {"name": "Informburo", "type": "news", "base_url": "https://informburo.kz", "country": "KZ", "language": "ru", "trust_score": 0.88},
    {"name": "NUR.KZ", "type": "news", "base_url": "https://nur.kz", "country": "KZ", "language": "ru", "trust_score": 0.82},
    {"name": "Kapital.kz", "type": "news", "base_url": "https://kapital.kz", "country": "KZ", "language": "ru", "trust_score": 0.87},
    {"name": "Forbes Kazakhstan", "type": "news", "base_url": "https://forbes.kz", "country": "KZ", "language": "ru", "trust_score": 0.92},
    {"name": "Instagram KZ", "type": "instagram", "base_url": "https://instagram.com", "country": "KZ", "language": "ru", "trust_score": 0.6},
    {"name": "Telegram Channels", "type": "telegram", "base_url": "https://t.me", "country": "KZ", "language": "ru", "trust_score": 0.55},
    {"name": "Facebook KZ", "type": "facebook", "base_url": "https://facebook.com", "country": "KZ", "language": "ru", "trust_score": 0.65},
    {"name": "YouTube KZ", "type": "youtube", "base_url": "https://youtube.com", "country": "KZ", "language": "ru", "trust_score": 0.7},
    {"name": "Twitter/X", "type": "twitter", "base_url": "https://x.com", "country": "US", "language": "en", "trust_score": 0.6},
    {"name": "Reuters", "type": "news", "base_url": "https://reuters.com", "country": "GB", "language": "en", "trust_score": 0.95},
]

TOPICS_DATA = [
    {"name": "Экономика", "description": "Экономические новости и финансы"},
    {"name": "Технологии", "description": "IT и технологические инновации"},
    {"name": "Политика", "description": "Политические события и решения"},
    {"name": "Социальная сфера", "description": "Социальные вопросы и общество"},
    {"name": "Спорт", "description": "Спортивные события и достижения"},
    {"name": "Образование", "description": "Образование и наука"},
    {"name": "Здравоохранение", "description": "Медицина и здоровье"},
    {"name": "Культура", "description": "Культурные события и искусство"},
]

MENTION_TITLES = [
    "Казахстан объявил о новой стратегии цифровизации экономики",
    "Рост ВВП Казахстана превысил ожидания аналитиков",
    "Новый технопарк открыт в Астане: 500 рабочих мест",
    "Казахстанские стартапы привлекли рекордные инвестиции",
    "Нацбанк сохранил базовую ставку на уровне 14.25%",
    "Экспорт IT-услуг из Казахстана вырос на 45%",
    "Алматы вошел в топ-10 городов Центральной Азии для бизнеса",
    "Программа 'Цифровой Казахстан' показала первые результаты",
    "Казахстанский банковский сектор демонстрирует устойчивый рост",
    "Новые меры поддержки МСБ в Казахстане",
    "Международный форум в Астане привлек 2000 участников",
    "Туристический сектор Казахстана восстановился после пандемии",
    "Казахстан усиливает сотрудничество со странами ЕАЭС",
    "Инвестиции в зеленую энергетику Казахстана удвоились",
    "Образовательная реформа: новые стандарты для школ",
    "Казахстанские спортсмены завоевали медали на чемпионате мира",
    "Рейтинг Doing Business: Казахстан улучшил позиции",
    "Новый закон о защите персональных данных вступил в силу",
    "Казахстан и Китай подписали новые торговые соглашения",
    "Развитие транспортной инфраструктуры Казахстана",
    "Аграрный сектор: рекордный урожай зерновых",
    "Казахстанский тенге укрепился к доллару",
    "Новая программа развития искусственного интеллекта",
    "Строительный бум в Астане: новые жилые комплексы",
    "Экологические инициативы в Казахстане набирают обороты",
    "Реформа здравоохранения: цифровые поликлиники",
    "Казахстанские компании выходят на рынки Юго-Восточной Азии",
    "Развитие электронного правительства в Казахстане",
    "Молодежная политика: новые программы стажировок",
    "Казахстан привлекает иностранные технологические компании",
]

COUNTRIES = ["KZ", "RU", "US", "GB", "DE", "TR", "CN", "UZ", "KG", "FR"]
SENTIMENTS = ["positive", "neutral", "negative"]
LANGUAGES = ["ru", "en", "kz"]

INFLUENCERS_DATA = [
    {"handle": "@astana_times", "platform": "twitter", "display_name": "Astana Times", "followers": 125000, "avg_engagement": 3.2},
    {"handle": "@kazakh_invest", "platform": "instagram", "display_name": "Kazakh Invest", "followers": 89000, "avg_engagement": 4.1},
    {"handle": "@forbes_kz", "platform": "telegram", "display_name": "Forbes Kazakhstan", "followers": 230000, "avg_engagement": 5.5},
    {"handle": "@digital_kz", "platform": "telegram", "display_name": "Digital Kazakhstan", "followers": 67000, "avg_engagement": 3.8},
    {"handle": "@nur_kz_official", "platform": "instagram", "display_name": "NUR.KZ", "followers": 450000, "avg_engagement": 2.9},
    {"handle": "@tengri_news", "platform": "twitter", "display_name": "Tengrinews", "followers": 350000, "avg_engagement": 4.7},
    {"handle": "@tech_hub_astana", "platform": "linkedin", "display_name": "Tech Hub Astana", "followers": 45000, "avg_engagement": 6.2},
    {"handle": "@kz_business", "platform": "facebook", "display_name": "KZ Business Portal", "followers": 78000, "avg_engagement": 3.5},
    {"handle": "@almaty_today", "platform": "telegram", "display_name": "Almaty Today", "followers": 190000, "avg_engagement": 4.0},
    {"handle": "@startup_kz", "platform": "instagram", "display_name": "Startup Kazakhstan", "followers": 56000, "avg_engagement": 5.1},
]


async def seed():
    async with AsyncSessionLocal() as db:
        existing = await db.execute(
            __import__("sqlalchemy").select(User).limit(1)
        )
        if existing.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        print("Seeding database...")

        # Users
        admin = User(
            id=str(uuid.uuid4()),
            email="admin@sentinews.kz",
            name="Admin User",
            hashed_password=hash_password("admin123"),
            role="admin",
            locale="ru",
            timezone="Asia/Almaty",
        )
        analyst = User(
            id=str(uuid.uuid4()),
            email="analyst@sentinews.kz",
            name="Аналитик Нурасыл",
            hashed_password=hash_password("analyst123"),
            role="analyst",
            locale="ru",
            timezone="Asia/Almaty",
        )
        db.add_all([admin, analyst])
        await db.flush()
        print(f"  Created {2} users")

        # Projects
        project1 = Project(
            id=str(uuid.uuid4()),
            name="Kazakhstan Brand Monitor",
            description="Мониторинг упоминаний Казахстана в медиа",
            owner_id=admin.id,
            settings={
                "keywords": ["Казахстан", "Kazakhstan", "Астана", "Алматы"],
                "excludedKeywords": [],
                "activeSources": ["news", "telegram", "instagram"],
                "excludedSites": [],
                "notifications": {"email": True, "alertThreshold": 100},
            },
        )
        project2 = Project(
            id=str(uuid.uuid4()),
            name="Tech Industry Tracker",
            description="Отслеживание технологической индустрии",
            owner_id=admin.id,
            settings={
                "keywords": ["AI", "startup", "технологии", "инновации"],
                "excludedKeywords": [],
                "activeSources": ["news", "twitter", "linkedin"],
                "excludedSites": [],
                "notifications": {"email": False},
            },
        )
        db.add_all([project1, project2])
        await db.flush()
        print(f"  Created 2 projects")

        # Sources
        sources = []
        for sd in SOURCES_DATA:
            s = Source(
                id=str(uuid.uuid4()),
                project_id=project1.id,
                **sd,
                active=True,
            )
            sources.append(s)
        db.add_all(sources)
        await db.flush()
        print(f"  Created {len(sources)} sources")

        # Topics
        topics = []
        for td in TOPICS_DATA:
            t = Topic(
                id=str(uuid.uuid4()),
                project_id=project1.id,
                sentiment_distribution={"positive": random.uniform(0.2, 0.5), "neutral": random.uniform(0.3, 0.5), "negative": random.uniform(0.05, 0.3)},
                **td,
            )
            topics.append(t)
        db.add_all(topics)
        await db.flush()
        print(f"  Created {len(topics)} topics")

        # Mentions
        now = datetime.now(timezone.utc)
        mentions = []
        for i in range(200):
            source = random.choice(sources)
            topic = random.choice(topics)
            sentiment = random.choices(SENTIMENTS, weights=[0.4, 0.35, 0.25])[0]
            score_ranges = {"positive": (0.5, 1.0), "neutral": (-0.3, 0.3), "negative": (-1.0, -0.5)}
            score_range = score_ranges[sentiment]
            title = random.choice(MENTION_TITLES)

            m = Mention(
                id=str(uuid.uuid4()),
                project_id=project1.id,
                source_id=source.id,
                url=f"{source.base_url}/article/{uuid.uuid4().hex[:8]}",
                title=title,
                body=f"{title}. " + "Подробности в статье. " * random.randint(3, 10),
                snippet=title[:150],
                published_at=now - timedelta(
                    days=random.randint(0, 90),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59),
                ),
                language=random.choice(LANGUAGES),
                country=random.choices(COUNTRIES, weights=[40, 20, 10, 5, 5, 5, 5, 5, 3, 2])[0],
                sentiment_score=round(random.uniform(*score_range), 3),
                sentiment_label=sentiment,
                topic_id=topic.id,
                reach=random.randint(100, 500000),
                influence_score=round(random.uniform(0.1, 1.0), 2),
                visited=random.random() > 0.6,
                saved=random.random() > 0.85,
                emotions={
                    "joy": round(random.uniform(0, 1), 3),
                    "anger": round(random.uniform(0, 0.5), 3),
                    "sadness": round(random.uniform(0, 0.4), 3),
                    "surprise": round(random.uniform(0, 0.6), 3),
                    "fear": round(random.uniform(0, 0.3), 3),
                },
                entities=[
                    {"id": str(uuid.uuid4()), "type": "LOC", "value": "Казахстан", "startPos": 0, "endPos": 9, "confidence": 0.95},
                    {"id": str(uuid.uuid4()), "type": "ORG", "value": source.name, "startPos": 10, "endPos": 20, "confidence": 0.88},
                ],
                tags=random.sample(["breaking", "exclusive", "analysis", "opinion", "interview", "report"], k=random.randint(0, 3)),
                summary=f"Краткое содержание: {title[:80]}",
            )
            mentions.append(m)

        db.add_all(mentions)
        await db.flush()
        print(f"  Created {len(mentions)} mentions")

        # Insights
        insight_types = ["trend_up", "trend_down", "anomaly", "recommendation", "alert", "summary"]
        severities = ["low", "medium", "high", "critical"]
        insights = []
        for i in range(15):
            ins = Insight(
                id=str(uuid.uuid4()),
                project_id=project1.id,
                type=random.choice(insight_types),
                title=random.choice([
                    "Рост позитивных упоминаний на 23%",
                    "Аномальный всплеск активности в Telegram",
                    "Рекомендация: усилить мониторинг Instagram",
                    "Тренд: рост интереса к теме AI",
                    "Негативный тренд в новостных источниках",
                    "Критический алерт: резкий рост негатива",
                    "Недельная сводка: стабильный позитив",
                    "Обнаружен новый влиятельный источник",
                ]),
                description="Детальный анализ показывает значительные изменения в медиа-поле за последний период.",
                metric=round(random.uniform(10, 1000), 1),
                metric_change=round(random.uniform(-50, 50), 1),
                severity=random.choice(severities),
                related_mention_ids=[m.id for m in random.sample(mentions, min(5, len(mentions)))],
            )
            insights.append(ins)
        db.add_all(insights)
        await db.flush()
        print(f"  Created {len(insights)} insights")

        # Influencers
        influencers = []
        for inf_data in INFLUENCERS_DATA:
            inf = Influencer(
                id=str(uuid.uuid4()),
                project_id=project1.id,
                handle=inf_data["handle"],
                platform=inf_data["platform"],
                display_name=inf_data["display_name"],
                followers=inf_data["followers"],
                avg_engagement=inf_data["avg_engagement"],
                influence_score=round(random.uniform(0.5, 1.0), 2),
                mentions_count=random.randint(5, 100),
                reach=random.randint(10000, 1000000),
                share_of_voice=round(random.uniform(1, 25), 1),
                sentiment_distribution={
                    "positive": round(random.uniform(0.3, 0.6), 2),
                    "neutral": round(random.uniform(0.2, 0.4), 2),
                    "negative": round(random.uniform(0.05, 0.2), 2),
                },
                last_seen=now - timedelta(days=random.randint(0, 7)),
            )
            influencers.append(inf)
        db.add_all(influencers)
        await db.flush()
        print(f"  Created {len(influencers)} influencers")

        await db.commit()
        print("\nSeeding complete!")
        print(f"  Login: admin@sentinews.kz / admin123")
        print(f"  Login: analyst@sentinews.kz / analyst123")


if __name__ == "__main__":
    asyncio.run(seed())
