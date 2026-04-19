from fastapi import APIRouter
from app.api.routes import auth, users, projects, mentions, sources, insights, ai, reports, filters, analytics, influencers, ingestion, alerts, source_catalog, topics

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/user", tags=["Users"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(mentions.router, tags=["Mentions"])
api_router.include_router(sources.router, tags=["Sources"])
api_router.include_router(insights.router, tags=["Insights"])
api_router.include_router(ai.router, tags=["AI"])
api_router.include_router(reports.router, tags=["Reports"])
api_router.include_router(filters.router, tags=["Filters"])
api_router.include_router(analytics.router, tags=["Analytics"])
api_router.include_router(influencers.router, tags=["Influencers"])
api_router.include_router(ingestion.router, tags=["Ingestion"])
api_router.include_router(alerts.router, tags=["Alerts"])
api_router.include_router(source_catalog.router, tags=["SourceCatalog"])
api_router.include_router(topics.router, tags=["Topics"])
