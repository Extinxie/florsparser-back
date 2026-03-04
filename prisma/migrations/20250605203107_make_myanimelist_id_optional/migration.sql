-- CreateEnum
CREATE TYPE "AnimeCountry" AS ENUM ('OTHER', 'JAPAN', 'CHINA', 'KOREA');

-- CreateEnum
CREATE TYPE "AnimeStatus" AS ENUM ('ANNOUNCE', 'ONGOING', 'RELEASED');

-- CreateEnum
CREATE TYPE "AnimeType" AS ENUM ('TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC', 'PV', 'CM');

-- CreateEnum
CREATE TYPE "AnimeRating" AS ENUM ('SAFE', 'SUGGESTIVE', 'QUESTIONABLE', 'EXPLICIT');

-- CreateEnum
CREATE TYPE "AnimeSeason" AS ENUM ('WINTER', 'SPRING', 'SUMMER', 'AUTUMN');

-- CreateEnum
CREATE TYPE "TranslationPlayer" AS ENUM ('KODIK', 'LIBRIA');

-- CreateEnum
CREATE TYPE "TranslationType" AS ENUM ('VOICE', 'SUBTITLES');

-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('DEMOGRAPHIC', 'GENRE', 'THEME');

-- CreateTable
CREATE TABLE "animes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shikimori_id" INTEGER NOT NULL,
    "myanimelist_id" INTEGER,
    "anilist_id" INTEGER,
    "anilibria_id" INTEGER,
    "kinopoisk_id" INTEGER,
    "imdb_id" TEXT,
    "kodik_id" TEXT,
    "aksor_id" TEXT,
    "native_title" TEXT NOT NULL,
    "romaji_title" TEXT NOT NULL,
    "russian_title" TEXT,
    "english_title" TEXT,
    "poster" TEXT,
    "banner" TEXT,
    "description" TEXT,
    "synonyms" TEXT[],
    "note" TEXT,
    "hashtag" TEXT,
    "country" "AnimeCountry" NOT NULL DEFAULT 'JAPAN',
    "status" "AnimeStatus" NOT NULL DEFAULT 'ONGOING',
    "type" "AnimeType" NOT NULL DEFAULT 'TV',
    "rating" "AnimeRating" NOT NULL DEFAULT 'SAFE',
    "season" "AnimeSeason",
    "year" INTEGER,
    "aired_on" TIMESTAMP(3),
    "released_on" TIMESTAMP(3),
    "next_episode_at" TIMESTAMP(3),
    "episodes_count" INTEGER,
    "episodes_aired" INTEGER,
    "duration" INTEGER,
    "shikimori_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "myanimelist_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "anilist_rating" INTEGER NOT NULL DEFAULT 0,
    "kinopoisk_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imdb_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bayesian_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "has_lgbt" BOOLEAN NOT NULL DEFAULT false,
    "is_censored" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "animes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licensors" (
    "id" TEXT NOT NULL,
    "countries" TEXT[],
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "licensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "duration" INTEGER,
    "anime_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "type" "TranslationType" NOT NULL,
    "player" "TranslationPlayer" NOT NULL,
    "source" JSONB NOT NULL,
    "episode_id" TEXT NOT NULL,
    "translator_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translators" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "translators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "shikimori_id" INTEGER NOT NULL,
    "russian_title" TEXT NOT NULL,
    "english_title" TEXT NOT NULL,
    "type" "TagType" NOT NULL,
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studios" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screenshots" (
    "id" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "preview_url" TEXT,
    "anime_id" TEXT,
    "episode_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "screenshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "player_url" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "anime_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AnimeToLicensor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_AnimeToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_AnimeToStudio" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "animes_slug_key" ON "animes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "animes_shikimori_id_key" ON "animes"("shikimori_id");

-- CreateIndex
CREATE UNIQUE INDEX "animes_anilist_id_key" ON "animes"("anilist_id");

-- CreateIndex
CREATE UNIQUE INDEX "animes_anilibria_id_key" ON "animes"("anilibria_id");

-- CreateIndex
CREATE UNIQUE INDEX "animes_kinopoisk_id_key" ON "animes"("kinopoisk_id");

-- CreateIndex
CREATE UNIQUE INDEX "animes_imdb_id_key" ON "animes"("imdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "animes_kodik_id_key" ON "animes"("kodik_id");

-- CreateIndex
CREATE UNIQUE INDEX "animes_aksor_id_key" ON "animes"("aksor_id");

-- CreateIndex
CREATE UNIQUE INDEX "licensors_title_key" ON "licensors"("title");

-- CreateIndex
CREATE INDEX "episodes_anime_id_number_idx" ON "episodes"("anime_id", "number");

-- CreateIndex
CREATE INDEX "translations_episode_id_translator_id_idx" ON "translations"("episode_id", "translator_id");

-- CreateIndex
CREATE UNIQUE INDEX "translators_title_key" ON "translators"("title");

-- CreateIndex
CREATE UNIQUE INDEX "tags_shikimori_id_key" ON "tags"("shikimori_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_russian_title_key" ON "tags"("russian_title");

-- CreateIndex
CREATE UNIQUE INDEX "tags_english_title_key" ON "tags"("english_title");

-- CreateIndex
CREATE UNIQUE INDEX "studios_title_key" ON "studios"("title");

-- CreateIndex
CREATE UNIQUE INDEX "_AnimeToLicensor_AB_unique" ON "_AnimeToLicensor"("A", "B");

-- CreateIndex
CREATE INDEX "_AnimeToLicensor_B_index" ON "_AnimeToLicensor"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AnimeToTag_AB_unique" ON "_AnimeToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_AnimeToTag_B_index" ON "_AnimeToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AnimeToStudio_AB_unique" ON "_AnimeToStudio"("A", "B");

-- CreateIndex
CREATE INDEX "_AnimeToStudio_B_index" ON "_AnimeToStudio"("B");

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_anime_id_fkey" FOREIGN KEY ("anime_id") REFERENCES "animes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_translator_id_fkey" FOREIGN KEY ("translator_id") REFERENCES "translators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_anime_id_fkey" FOREIGN KEY ("anime_id") REFERENCES "animes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_anime_id_fkey" FOREIGN KEY ("anime_id") REFERENCES "animes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnimeToLicensor" ADD CONSTRAINT "_AnimeToLicensor_A_fkey" FOREIGN KEY ("A") REFERENCES "animes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnimeToLicensor" ADD CONSTRAINT "_AnimeToLicensor_B_fkey" FOREIGN KEY ("B") REFERENCES "licensors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnimeToTag" ADD CONSTRAINT "_AnimeToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "animes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnimeToTag" ADD CONSTRAINT "_AnimeToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnimeToStudio" ADD CONSTRAINT "_AnimeToStudio_A_fkey" FOREIGN KEY ("A") REFERENCES "animes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnimeToStudio" ADD CONSTRAINT "_AnimeToStudio_B_fkey" FOREIGN KEY ("B") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
