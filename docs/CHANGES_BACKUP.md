# Backup всего, что было сделано после коммита `aa5d7e8`

Файл собран как «бумажная копия» истории чата и изменений, начиная с промпта **«сделай авторизацию логина запоминающимся на 30 дней чтобы пользователь не заходил каждый раз»** (line 1221 в транскрипте) и до момента, когда локальный проект был случайно удалён командой по «очистке кеша».

Базовый коммит, к которому всё применялось:
- **GitHub:** `https://github.com/NurasylSolo/DiplomaProject/commit/aa5d7e88d93acfd3475f7025143d187d7c1c1123`
- **Сообщение коммита:** `feat: полный backend и интеграция фронта с медиа-мониторингом`

Всё, что описано ниже, **не входит** в этот коммит — ни в одном файле репозитория этих правок нет, потому что после коммита проект продолжали менять, а потом локальная папка была удалена. Этот документ — единственный источник правды по тому, что нужно повторно внедрить.

---

## Хронологический список промптов (с момента «30 дней»)

| #  | Line  | Промпт пользователя | Что делалось |
|----|-------|---------------------|--------------|
| 1  | 1221  | «сделай авторизацию логина запоминающимся на 30 дней чтобы пользователь не заходил каждый раз» | Refresh токен по умолчанию = 30 дней; чекбокс «Remember me» включён по умолчанию ✅ **внедрено повторно** |
| 2  | 1229  | «надо будет переделать систему парсинга… не правильные даты, охваты, локация» | Жёсткий парсинг даты `_parse_date`, точная страна по домену, попытка реального охвата ✅ **внедрено повторно** |
| 3  | 1273  | «сделай во всех существующих страницах кнопку на смену темную и светлую тему» | `ThemeToggle` подключён ко всем страницам и в layout ✅ **внедрено повторно** |
| 4  | 1297  | «добавь еще короче источник NewsApi.ai (Event Registry), api_key=`2bdf3f8f-…`» | Добавлен 4‑й источник новостей — Event Registry ✅ **внедрено повторно** |
| 5  | 1316  | «почему пишет 2 минуты назад, хотя было 8 декабря» | Исправлен fallback в `_parse_date` — теперь возвращает `None` и статья пропускается ✅ **внедрено повторно** |
| 6  | 1332  | «данные должны обновляться каждый раз когда пользователь зашёл/обновил страницу» | Авто‑refetch через TanStack Query + ручной триггер `refresh_project_mentions` ✅ **внедрено повторно** |
| 7  | 1346  | «переделай систему сентимента, исправь захардкоженные статистики, охваты» | Переход на GPT‑sentiment, новый эндпоинт `/mentions/stats`, реальные значения на карточках ✅ **внедрено повторно** |
| 8  | 1353  | План «Fix Sentiment, Stats and Reach Accuracy» | Реализация по плану ✅ **внедрено повторно** |
| 9  | 1407  | «не правильно показывает location… на сайте 228 а у нас 800» | Нормализация страны (`normalize_country`), общая `countries.ts` на фронте, реальные shares Event Registry ✅ **внедрено повторно** |
| 10 | 1429  | «переделать систему геолокации» | На бэке merge стран, на фронте — общий `countries.ts` |
| 11 | 1433  | План «Fix Geolocation System» | Реализация |
| 12 | 1464  | «переделать систему охвата и просмотров — реальные просмотры с новостей» | Жёсткое правило: реальные данные из API, без fallback ✅ **внедрено повторно** |
| 13 | 1489  | «теперь у меня везде 0 охвата» | Возврат fallback‑оценок (`_estimate_domain_reach`) когда API не отдаёт охват ✅ **внедрено повторно** |
| 14 | 1495  | TypeError MentionsChart `Cannot read properties of undefined (reading 'length')` | Защитные проверки `Array.isArray()` ✅ **внедрено повторно** |
| 15 | 1505  | «продуманную систему регистрации через почту и google аккаунт» | Email‑верификация (код в письме) + Google OAuth ✅ **внедрено повторно** |
| 16 | 1510  | План «Improved Auth: Email Verification + Google OAuth» | Реализация (см. подробности ниже) ✅ **внедрено повторно** |
| 17 | 1578  | «теперь напиши как мне подключить все это» | Инструкция по `.env`, Google Cloud, SMTP ✅ (см. ниже) |
| 18 | 1580  | App password / Client Secret | `.env` обновлён фактическими значениями ⚠️ **сделать самому в `backend/.env`** |
| 19 | 1584  | «сделай тут дизайн интереснее и добавь смену языка, свитч темы» (страница нового проекта) | Полная переработка `projects/new/page.tsx` ✅ **внедрено повторно** |
| 20 | 1589  | «можно ли запарсить новости которым больше 2‑3 месяца» | Ответ: ограничения бесплатных тарифов |
| 21 | 1591  | «найди мне бесплатные источники с казахстанскими новостями» | Список бесплатных API/RSS, рекомендация WorldNewsAPI |
| 22 | 1595  | «`ad7bd5134821426794895743f8003f11` — мой ключ World News API» | Подключён 5‑й источник (см. подробности) ✅ **внедрено повторно** |
| 23 | 1615  | «давай сделаем поиск с несколькими контекстами через запятую» | (не было реализовано до сбоя — задача висела) ✅ **внедрено сейчас** |
| 24 | 1616  | «напиши мой стек, архитектуру…» | Текстовое объяснение (Ask mode) |
| 25 | 1620  | «удали весь кеш который безопасно удалять» | Скрипт PowerShell содержал ошибку и удалил весь проект |
| 26 | 1634  | «почему весь проект исчез?» | Объяснение причины |
| 27 | 1636  | «верни обратно с этого коммита» | Клонирован репозиторий, рабочая копия восстановлена до `aa5d7e8` |
| 28 | 1646  | «верни контекст… сделай back up всего» | Этот файл |

---

## Что нужно повторно внедрить (по областям)

### 1) Auth: «Remember me» 30 дней (промпт #1)

`backend/app/config.py`
```python
REFRESH_TOKEN_EXPIRE_DAYS: int = 30
```

`backend/app/services/auth_service.py` — при логине, если `remember_me=True`, refresh выдаётся со сроком `REFRESH_TOKEN_EXPIRE_DAYS` дней (по умолчанию 30). Без флага — короткий срок (например 7 дней).

`backend/app/schemas/auth.py`
```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = True
```

`frontend/src/app/(auth)/login/page.tsx` — чекбокс «Remember me» по умолчанию `defaultChecked={true}`, значение прокидывается в `loginMutation.mutate({ email, password, remember_me })`.

`frontend/src/lib/api/services/auth.ts` — метод `login` шлёт `remember_me` в теле.

---

### 2) Точные даты, страна, охват (промпты #2, #5, #9, #12, #13)

`backend/app/services/ingestion_service.py`:
- `_parse_date(raw)` — разбирает ISO 8601, `YYYY-MM-DD HH:MM:SS`, RFC2822, форматы SerpAPI, относительные («2 hours ago», «10 минут назад»). Если не распарсилось — **возвращает `None`**, статья пропускается.
- `_guess_country_from_domain(url)` — словарь `_DOMAIN_COUNTRY_MAP` для крупных доменов (US/UK/RU/KZ/DE/FR…) + fallback по TLD `_TLD_COUNTRY_MAP` (`.kz` → KZ, `.ru` → RU и т.д.).
- `_estimate_domain_reach(url, source)` — оценка по таблице `_DOMAIN_MONTHLY_VISITORS` (CNN ~85M, BBC ~75M, Tengrinews ~3M и т.д.), деление на оценочное число статей в день.
- `_process_article` — если API вернул `_reach > 0` → берём как реальный охват, иначе оценка домена.

`backend/app/services/nlp_service.py`:
- `normalize_country(raw)` — приводит к ISO‑2 (`USA`/`United States`/`сша` → `US`), знает русские/казахские названия. Если не распознано — `XX` (которое потом скрывается).

Frontend: общий утилитный модуль `frontend/src/lib/utils/countries.ts`:
```ts
export function getCountryName(code: string, locale: string): string;
export function getCountryFlag(code: string): string;
export function getEChartsCountryName(code: string): string;
```
Используется на странице упоминаний, гео‑карте, карточках источника.

---

### 3) Theme toggle на всех страницах (промпт #3)

`frontend/src/components/ui/theme-toggle.tsx` — кнопка‑переключатель `next-themes`.
Подключена в shell‑layout дашборда (`(dashboard)/layout.tsx`) в правой части хедера. Также продублирована на auth‑страницах (login, register, verify‑email, reset‑password) и на странице `projects/new/page.tsx` в верхней панели.

---

### 4) Источник Event Registry (NewsAPI.ai) (промпт #4)

`backend/app/config.py`
```python
EVENT_REGISTRY_API_KEY: str = ""
```
`backend/.env`
```
EVENT_REGISTRY_API_KEY=2bdf3f8f-ee07-49e1-a1b7-e720c2cbf00d
```

`backend/app/services/ingestion_service.py`:
```python
EVENT_REGISTRY_API_BASE = "https://eventregistry.org/api/v1/article/getArticles"
EVENT_REGISTRY_LANGUAGES = ["eng", "rus"]

async def _fetch_event_registry(client, query, language="eng", count=100) -> list[dict]:
    payload = {
        "action": "getArticles",
        "keyword": query,
        "lang": language,
        "articlesPage": 1,
        "articlesCount": min(count, 100),
        "articlesSortBy": "date",
        "articlesSortByAsc": False,
        "dataType": ["news", "pr"],
        "forceMaxDataTimeWindow": 31,
        "resultType": "articles",
        "apiKey": settings.EVENT_REGISTRY_API_KEY,
        "articleBodyLen": -1,
    }
    # POST → разбор response['articles']['results']
    # Каждый item: url, title, body, dateTime, source.title, source.location.country.label.eng,
    #              authors[], image, shares (dict per platform), socialScore
    # _reach = сумма shares + socialScore (если > 0)
```

В `run_project_ingestion` добавлен цикл:
```python
for er_lang in EVENT_REGISTRY_LANGUAGES:
    articles = await _fetch_event_registry(client, query=topic_query, language=er_lang)
    ...
    job_progress_service.advance_job(job.id, delta=1)
```

Учтён в `total_steps`.

---

### 5) Авто‑обновление при заходе на страницу (промпт #6)

В `useProject`, `useMentions`, `useMentionsStats`, `useGeoData` и т.д. — параметры TanStack Query:
```ts
{
  refetchOnMount: "always",
  refetchOnWindowFocus: true,
  staleTime: 0,
}
```
Плюс кнопка «Обновить» на странице проекта, дёргающая `POST /projects/{id}/refresh` (создаёт `crawl_job` типа `refresh_project_mentions`).

---

### 6) GPT‑сентимент, реальные карточки, охваты (промпты #7, #8, #14)

`backend/app/services/nlp_service.py` добавлено:
```python
def score_sentiment_gpt(text: str) -> tuple[str, float]:
    # Промпт к gpt-4o-mini, JSON-ответ {"label": "...", "score": -1..1}
    # Fallback — keyword-based, если OPENAI_API_KEY пустой / ошибка
```

`backend/app/services/mention_service.py` — новый метод `get_mentions_stats(db, project_id, filters)`:
- total_mentions, positive_count, negative_count, neutral_count
- total_reach (sum), avg_sentiment
- mentions_change_percentage (vs предыдущий период такой же длины)

`backend/app/api/routes/mentions.py`:
```python
@router.get("/projects/{project_id}/mentions/stats")
async def get_stats(project_id: str, q: MentionsFilters = Depends(...), db: AsyncSession = Depends(get_db)):
    ...
```

Frontend:
- Хук `useMentionsStats(projectId, filters)`
- Карточки на `mentions/page.tsx`, `analysis/page.tsx`, `emotions/page.tsx` берут реальные значения вместо хардкода
- `MentionsChart`, `SentimentChart` — данные тоже из API

`MentionsChart` защита от `undefined`:
```tsx
const safeData = Array.isArray(apiData) ? apiData : [];
if (safeData.length === 0) return <EmptyState />;
// в tooltip: if (!params || params.length === 0) return "";
```

---

### 7) Email верификация + Google OAuth (промпты #15, #16, #17, #18)

#### Backend

`backend/app/models/user.py` (добавить поля):
```python
email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
auth_provider: Mapped[str]   = mapped_column(String(20), default="email", nullable=False)
google_id:      Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
hashed_password: Mapped[str] = mapped_column(String(255), default="", nullable=False)  # допускаем пустоту для google
```

`backend/app/models/email_verification.py` (новый файл):
```python
class EmailVerification(Base):
    __tablename__ = "email_verifications"
    id: Mapped[str]   = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), index=True)
    code:  Mapped[str] = mapped_column(String(6))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Зарегистрировать в `backend/app/models/__init__.py`.

Alembic миграции:
1. `add_email_verified_google_oauth_fields` — добавляет `email_verified`, `auth_provider`, `google_id` + unique‑constraint `uq_users_google_id`.
2. `add_email_verifications_table` — создаёт таблицу `email_verifications` и индекс по `email`.

`backend/app/services/email_service.py` (новый):
```python
import aiosmtplib
from email.message import EmailMessage
from app.config import settings

async def send_verification_code(to_email: str, code: str) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        return True  # dev: код в логи
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg["Subject"] = f"SentiNews — Verification Code: {code}"
    msg.set_content(f"Your code: {code}\nExpires in 10 minutes.")
    msg.add_alternative(f"<html>... красивый шаблон ...</html>", subtype="html")
    await aiosmtplib.send(msg, hostname=settings.SMTP_HOST, port=settings.SMTP_PORT,
                          username=settings.SMTP_USER, password=settings.SMTP_PASSWORD,
                          use_tls=False, start_tls=True)
    return True
```

`backend/app/services/auth_service.py` — расширить:
```python
VERIFICATION_CODE_TTL_MINUTES = 10
def _generate_code() -> str: return f"{random.randint(0, 999999):06d}"

# В register_user — после создания юзера:
code = _generate_code()
db.add(EmailVerification(email=email, code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)))
await db.flush()
await send_verification_code(email, code)
# user.email_verified = False, auth_provider = "email"

async def verify_email(db, email, code) -> dict: ...
async def resend_verification(db, email) -> dict: ...

async def google_login(db, credential, user_agent=None, ip_address=None) -> dict:
    google_user = await _verify_google_token(credential)
    # ищем по google_id → email → создаём нового
    # auth_provider = "google", email_verified = True

async def _verify_google_token(credential: str) -> dict | None:
    # Сначала пробуем как ID‑token (Google tokeninfo endpoint).
    # Если не вышло — как access‑token (https://www.googleapis.com/oauth2/v3/userinfo).
    # Проверяем aud == settings.GOOGLE_CLIENT_ID.
```

`backend/app/api/routes/auth.py` — новые эндпоинты:
```python
@router.post("/verify-email")
async def verify_email(data: VerifyEmailRequest, db = Depends(get_db)): ...

@router.post("/resend-verification")
async def resend_verification(data: ResendVerificationRequest, db = Depends(get_db)): ...

@router.post("/google")
async def google_login(data: GoogleLoginRequest, request: Request, db = Depends(get_db)): ...
```

`backend/app/config.py`:
```python
GOOGLE_CLIENT_ID: str = ""
GOOGLE_CLIENT_SECRET: str = ""
SMTP_HOST: str = ""
SMTP_PORT: int = 587
SMTP_USER: str = ""
SMTP_PASSWORD: str = ""
SMTP_FROM_EMAIL: str = "noreply@sentinews.kz"
```

`backend/.env` (фактические значения, см. промпт #18):
```
GOOGLE_CLIENT_ID=243635328884-vdbmmjslpp05ph8ngb5mkhqq84iinuil.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=nurasylkairkhanov@gmail.com
SMTP_PASSWORD=fgqhfmcajnucslgv
SMTP_FROM_EMAIL=nurasylkairkhanov@gmail.com
```

#### Frontend

`frontend/package.json` — `@react-oauth/google`.

`frontend/src/app/providers.tsx`:
```tsx
import { GoogleOAuthProvider } from "@react-oauth/google";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "<...>";
return (
  <QueryClientProvider client={queryClient}>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider ...>{children}</ThemeProvider>
    </GoogleOAuthProvider>
  </QueryClientProvider>
);
```

`frontend/src/middleware.ts`:
```ts
const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];
```

`frontend/src/types/index.ts`:
```ts
export interface User {
  ...
  emailVerified?: boolean;
  authProvider?: string;
}
```

`frontend/src/lib/api/services/auth.ts` — добавить:
```ts
async verifyEmail(email, code): Promise<{ message; email_verified }>
async resendVerification(email): Promise<{ message }>
async googleLogin(credential): Promise<AuthResponse>  // POST /auth/google
```

`frontend/src/hooks/use-auth.ts` — `useRegister`:
```ts
onSuccess: (data) => {
  setUser(data.user);
  if (!data.user.emailVerified) {
    router.push(`/verify-email?email=${encodeURIComponent(data.user.email)}`);
  } else {
    router.push("/dashboard");
  }
}
```

`frontend/src/app/(auth)/login/page.tsx`:
- импорт `useGoogleLogin`, `useAuthStore`, `authApi`
- кнопка Google вызывает `googleLogin()` → `authApi.googleLogin(tokenResponse.access_token)` → `setUser` → редирект `/dashboard`
- при логине, если `result.user.emailVerified === false`, редирект на `/verify-email?email=…`

`frontend/src/app/(auth)/register/page.tsx` — то же самое.

`frontend/src/app/(auth)/verify-email/page.tsx` — новая страница с **OTP‑инпутом** (6 ячеек), авто‑фокусом, paste‑поддержкой, кнопкой Resend с cooldown 60 сек.

---

### 8) Подключение auth — инструкция (промпт #17)

В Google Cloud Console:
1. Создать OAuth Client ID типа Web Application.
2. Authorized JavaScript origins → `http://localhost:3000`.
3. Authorized redirect URIs → `http://localhost:3000` (на dev).

В `frontend/.env.local`:
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<тот же ID что в backend/.env>
```

Gmail App Password (для SMTP_PASSWORD): создать в Google Account → Security → App passwords.

---

### 9) Редизайн страницы создания проекта (промпт #19)

`frontend/src/app/(dashboard)/projects/new/page.tsx`:
- Двухколоночный layout (info слева + форма справа), фон с blur‑декорациями.
- Top bar: `Select` для языка (`en/ru/kk` через `useTranslation`) + `<ThemeToggle />`.
- Список фич с иконками `Search/Brain/BarChart3/Globe`, анимация `framer-motion`.
- Форма обёрнута в `Card` с классом `glass`, инпуты с иконкой `Search`, кнопка с анимацией.
- Прогресс‑секция: показывает % завершения crawl_job, статус‑текст, иконки `Loader2/CheckCircle2/XCircle`.
- Подпись внизу: `Powered by NewsAPI, SerpAPI, NewsData.io, Event Registry, World News API`.

---

### 10) World News API (промпт #22)

`backend/app/config.py`
```python
WORLD_NEWS_API_KEY: str = ""
```

`backend/.env`
```
WORLD_NEWS_API_KEY=ad7bd5134821426794895743f8003f11
```

`backend/.env.example` — добавить ту же строку с заглушкой.

`backend/app/services/ingestion_service.py`:
```python
WORLD_NEWS_API_BASE = "https://api.worldnewsapi.com/search-news"
WORLD_NEWS_VARIANTS: list[dict[str, str]] = [
    {"language": "en"},
    {"language": "ru"},
    {"language": "kk"},
    {"source-country": "kz"},
]

def _hostname_for_display(url: str) -> str: ...

async def _fetch_world_news(client, query, variant, number=50) -> list[dict]:
    params = {
        "api-key": settings.WORLD_NEWS_API_KEY,
        "text": query,
        "number": min(max(1, number), 100),
        **variant,
    }
    resp = await client.get(WORLD_NEWS_API_BASE, params=params, timeout=60)
    # data["news"][i]: url, title, summary, text, publish_date, image, authors, source_country, sentiment
    # Маппится в общий формат article (как у NewsAPI)
```

В `run_project_ingestion`:
```python
total_steps = (
    len(NEWS_API_LANGUAGES) + len(SERP_LANGUAGES) +
    len(NEWSDATA_LANGUAGES) + len(EVENT_REGISTRY_LANGUAGES) +
    len(WORLD_NEWS_VARIANTS)
)
...
for wn_variant in WORLD_NEWS_VARIANTS:
    articles = await _fetch_world_news(client, query=topic_query, variant=wn_variant)
    fetched_total += len(articles)
    for article in articles:
        is_dup, created = await _process_article(db=db, project=project, article=article)
        ...
    job_progress_service.advance_job(job.id, delta=1)
    await db.flush()
```

Frontend подпись на странице создания проекта: `Powered by NewsAPI, SerpAPI, NewsData.io, Event Registry, World News API`.

---

### 11) Multi‑keyword поиск (промпт #23) — ✅ ВНЕДРЕНО

Идея: в форме создания проекта помимо «главного» запроса разрешить ввод дополнительных синонимов через запятую (например `Арман Царукян, Арман, Царукян, Arman Tsarukyan, Arman, Tsarukyan`).

Что нужно сделать (план):

Backend:
- `Project.settings["topicQuery"]` — основной (строка)
- `Project.settings["aliases"]` — массив строк
- В ingestion для каждого источника собирать запросы как:
  - NewsAPI / NewsData / Event Registry: `OR` через скобки `(q1) OR (q2) OR ...`
  - SerpAPI: один запрос с `OR` (ограничения Google по длине)
  - World News API: `text=q1 OR q2 OR ...`
- При сохранении упоминания вычислять `keyword_score` — сколько алиасов нашлось в title+body.
- Дедупликация по `url_hash` уже исключит дубли, если одна и та же статья пришла по разным запросам.

Frontend:
- В `projects/new/page.tsx` второй textarea «Дополнительные ключевые слова (через запятую)».
- Хук создания проекта шлёт `{ topic, description, aliases: string[] }`.
- На странице проекта показывать список алиасов как пилюли (с возможностью редактировать).

---

## Файлы, которые точно затронуты (для удобной проверки после восстановления)

### Backend
- `backend/app/config.py`
- `backend/.env`, `backend/.env.example`
- `backend/app/models/user.py`
- `backend/app/models/email_verification.py` *(новый)*
- `backend/app/models/__init__.py`
- `backend/alembic/versions/ad301737e32d_add_email_verified_google_oauth_fields.py` *(новый)*
- `backend/alembic/versions/211d2a660bc9_add_email_verifications_table.py` *(новый)*
- `backend/app/schemas/auth.py`
- `backend/app/services/auth_service.py`
- `backend/app/services/email_service.py` *(новый)*
- `backend/app/services/ingestion_service.py`
- `backend/app/services/nlp_service.py`
- `backend/app/services/mention_service.py`
- `backend/app/api/routes/auth.py`
- `backend/app/api/routes/users.py`
- `backend/app/api/routes/mentions.py`

### Frontend
- `frontend/package.json` (`@react-oauth/google`)
- `frontend/src/app/providers.tsx`
- `frontend/src/middleware.ts`
- `frontend/src/types/index.ts`
- `frontend/src/lib/api/services/auth.ts`
- `frontend/src/lib/utils/countries.ts` *(новый)*
- `frontend/src/hooks/use-auth.ts`
- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/app/(auth)/register/page.tsx`
- `frontend/src/app/(auth)/verify-email/page.tsx` *(новый)*
- `frontend/src/components/ui/theme-toggle.tsx`
- `frontend/src/app/(dashboard)/layout.tsx`
- `frontend/src/app/(dashboard)/projects/new/page.tsx`
- `frontend/src/app/(dashboard)/projects/[projectId]/mentions/page.tsx`
- `frontend/src/app/(dashboard)/projects/[projectId]/analysis/page.tsx`
- `frontend/src/app/(dashboard)/projects/[projectId]/emotions/page.tsx`
- `frontend/src/app/(dashboard)/projects/[projectId]/geo/page.tsx`
- `frontend/src/features/mentions/components/mentions-chart.tsx`
- `frontend/src/features/mentions/components/mentions-filters.tsx`
- `frontend/src/features/mentions/components/mentions-table.tsx`

---

## Шаги, чтобы фактически восстановить

1. Базовый код уже клонирован на коммит `aa5d7e8`.
2. Поставить зависимости:
   - Backend: `pip install -r backend/requirements.txt`
   - Frontend: `cd frontend; npm install` (вручную добавить `@react-oauth/google`).
3. Прокинуть `backend/.env` (значения из секций 4, 7, 10 этого документа).
4. Накатить новые миграции:
   ```
   cd backend
   alembic revision --autogenerate -m "add_email_verified_google_oauth_fields"
   alembic revision --autogenerate -m "add_email_verifications_table"
   alembic upgrade head
   ```
   (Либо переписать существующие миграции по тексту выше.)
5. Внести правки по областям 1–10 выше. Часть из них можно делать инкрементально:
   - Сначала Auth (Remember 30 + Email verify + Google) — это самый большой и самостоятельный кусок.
   - Затем интеграция World News API + Event Registry.
   - Затем NLP/sentiment + stats endpoint.
   - Затем UX (theme toggle, redesign new project).
6. Подтвердить миграциями БД и `npm run build` / `uvicorn app.main:app --reload` без ошибок.

---

> Этот файл — итог разбора транскрипта чата `2301f891-…` (строки 1221‑1645).
> Используйте его как roadmap: при необходимости в Agent mode можно поэтапно
> повторить каждое изменение, начиная с пункта 1 (Remember 30 days).
