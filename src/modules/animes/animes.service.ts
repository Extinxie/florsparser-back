import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AxiosError } from 'axios';

@Injectable()
export class AnimesService {
  private readonly logger = new Logger(AnimesService.name);
  private readonly shikimoriBaseUrl = 'https://shikimori.one';
  private readonly maxRetries = 3;
  private readonly timeout = 30000;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  private generateSlug(title: string, id?: number): string {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return id ? `${baseSlug}-${id}` : baseSlug;
  }

  private async makeRequest(page = 1, retryCount = 0): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.shikimoriBaseUrl}/api/animes`, {
          params: {
            limit: 50,
            page: page,
          },
          headers: {
            'User-Agent': 'AniFlors/1.0',
          },
          timeout: this.timeout,
        }),
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && retryCount < this.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return this.makeRequest(page, retryCount + 1);
      }
      throw error;
    }
  }

  // ловим описание аниме с шикимори
  private async getAnimeDescription(
    shikimoriId: number,
  ): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.shikimoriBaseUrl}/api/animes/${shikimoriId}`,
          {
            headers: {
              'User-Agent': 'AniFlors/1.0',
              Accept: 'application/json',
            },
            timeout: this.timeout,
          },
        ),
      );
      return response.data?.description;
    } catch (error) {
      return null;
    }
  }
  // парс оняме и пересчет эп
  async parseAllAnimes() {
    try {
      let page = 1;
      let totalAnimes = 0;
      let hasMore = true;

      while (hasMore) {
        const data = await this.makeRequest(page);

        if (!data || data.length === 0) {
          hasMore = false;
          continue;
        }

        const filteredAnimes = data.filter((anime) => {
          const score = parseFloat(anime.score) || 0;
          return score > 3;
        });

        const animes = filteredAnimes.map((anime) => ({
          shikimoriId: anime.id,
          myanimelistId: anime.myanimelist_id || null,
          slug: this.generateSlug(anime.name, anime.id),
          nativeTitle: anime.name,
          romajiTitle: anime.name,
          russianTitle: anime.russian,
          englishTitle: anime.english,
          poster: anime.image?.original,
          banner: anime.image?.preview,
          description: anime.description || null,
          synonyms: anime.synonyms || [],
          status: this.mapStatus(anime.status) as any,
          type: this.mapType(anime.kind) as any,
          rating: this.mapRating(anime.rating) as any,
          year: anime.aired_on ? new Date(anime.aired_on).getFullYear() : null,
          airedOn: anime.aired_on ? new Date(anime.aired_on) : null,
          releasedOn: anime.released_on ? new Date(anime.released_on) : null,
          episodesCount: anime.episodes,
          episodesAired: anime.episodes_aired,
          duration: anime.duration,
          shikimoriRating: parseFloat(anime.score) || 0,
          averageRating: parseFloat(anime.score) || 0,
        }));

        for (const anime of animes) {
          try {
            let description = anime.description;
            if (!description) {
              description = await this.getAnimeDescription(anime.shikimoriId);
              await new Promise((resolve) => setTimeout(resolve, 200));
            }

            const animeData = {
              ...anime,
              description: description || null,
            };

            const savedAnime = await this.prisma.anime.upsert({
              where: { shikimoriId: animeData.shikimoriId },
              update: animeData,
              create: animeData,
            });

            if (savedAnime.episodesCount && savedAnime.episodesCount > 0) {
              const existingEpisodes = await this.prisma.episode.count({
                where: { animeId: savedAnime.id },
              });

              if (existingEpisodes === 0) {
                this.logger.log(
                  `${savedAnime.episodesCount} эп. ${savedAnime.nativeTitle}`,
                );

                const episodes = Array.from(
                  { length: savedAnime.episodesCount },
                  (_, i) => ({
                    number: i + 1,
                    duration: savedAnime.duration,
                    animeId: savedAnime.id,
                  }),
                );

                await this.prisma.episode.createMany({
                  data: episodes,
                });
              }
            }

            totalAnimes++;
          } catch (error) {
            this.logger.error(`Ошибка ${anime.shikimoriId}: ${error.message}`);
          }
        }

        page++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return {
        success: true,
        count: totalAnimes,
        message: `${totalAnimes}`,
      };
    } catch (error) {
      throw new Error(`Ошибка парсера: ${error.message}`);
    }
  }

  // поиск аниме по бд + шики по уст shikiId
  async getAnimeById(id: number) {
    try {
      const anime = await this.prisma.anime.findUnique({
        where: { shikimoriId: id },
      });

      if (anime) {
        return anime;
      }
      const url = `${this.shikimoriBaseUrl}/api/animes/${id}`;

      try {
        const response = await firstValueFrom(
          this.httpService.get(url, {
            headers: {
              'User-Agent': 'AniFlors/1.0',
              Accept: 'application/json',
            },
            timeout: this.timeout,
          }),
        );

        const animeData = response.data;

        const newAnime = {
          shikimoriId: animeData.id,
          myanimelistId: animeData.myanimelist_id || null,
          slug: this.generateSlug(animeData.name, animeData.id),
          nativeTitle: animeData.name,
          romajiTitle: animeData.name,
          russianTitle: animeData.russian,
          englishTitle: animeData.english,
          poster: animeData.image?.original,
          banner: animeData.image?.preview,
          description: animeData.description,
          synonyms: animeData.synonyms || [],
          status: this.mapStatus(animeData.status) as any,
          type: this.mapType(animeData.kind) as any,
          rating: this.mapRating(animeData.rating) as any,
          year: animeData.aired_on
            ? new Date(animeData.aired_on).getFullYear()
            : null,
          airedOn: animeData.aired_on ? new Date(animeData.aired_on) : null,
          releasedOn: animeData.released_on
            ? new Date(animeData.released_on)
            : null,
          episodesCount: animeData.episodes,
          episodesAired: animeData.episodes_aired,
          duration: animeData.duration,
          shikimoriRating: parseFloat(animeData.score) || 0,
          averageRating: parseFloat(animeData.score) || 0,
        };

        const savedAnime = await this.prisma.anime.create({
          data: newAnime,
        });
        return savedAnime;
      } catch (error) {
        if (error.response) {
          if (error.response.status === 404) {
            throw new Error(`${id} не найдено`);
          }
        }
      }
    } catch (error) {
      throw new Error(`аниме не найдено: ${error.message}`);
    }
  }

  // проверка статуса аниме
  private mapStatus(status: string): string {
    const statusMap = {
      anons: 'ANNOUNCE',
      ongoing: 'ONGOING',
      released: 'RELEASED',
    };
    return statusMap[status] || 'ANNOUNCE';
  }

  // проходимся выводим тип
  private mapType(type: string): string {
    const typeMap = {
      tv: 'TV',
      movie: 'MOVIE',
      ova: 'OVA',
      ona: 'ONA',
      special: 'SPECIAL',
      music: 'MUSIC',
      pv: 'PV',
      cm: 'CM',
    };
    return typeMap[type] || 'TV';
  }
  private mapRating(rating: string): string {
    const ratingMap = {
      g: 'SAFE',
      pg: 'SAFE',
      pg_13: 'SAFE',
      r: 'SUGGESTIVE',
      r_plus: 'QUESTIONABLE',
      rx: 'EXPLICIT',
    };
    return ratingMap[rating] || 'SAFE';
  }

  private getFullPosterUrl(posterPath: string | null): string | null {
    if (!posterPath) return null;
    if (posterPath.startsWith('http')) return posterPath;
    return `${this.shikimoriBaseUrl}${posterPath}`;
  }

  // поиск аниме 
  async searchAnimes(query: string) {
    try {
      this.logger.log(`Поиск аниме по запросу: ${query}`);

      const animes = await this.prisma.anime.findMany({
        where: {
          OR: [
            { nativeTitle: { contains: query, mode: 'insensitive' } },
            { russianTitle: { contains: query, mode: 'insensitive' } },
            { englishTitle: { contains: query, mode: 'insensitive' } },
            { romajiTitle: { contains: query, mode: 'insensitive' } },
            { synonyms: { hasSome: [query] } },
          ],
        },
        select: {
          id: true,
          shikimoriId: true,
          slug: true,
          nativeTitle: true,
          russianTitle: true,
          englishTitle: true,
          poster: true,
          type: true,
          status: true,
          year: true,
          shikimoriRating: true,
        },
        take: 20,
        orderBy: {
          shikimoriRating: 'desc',
        },
      });

      return animes.map((anime) => {
        let slug = anime.slug;
        if (!slug && anime.shikimoriId) {
          slug = this.generateSlug(
            anime.nativeTitle ||
              anime.russianTitle ||
              anime.englishTitle ||
              'anime',
            anime.shikimoriId,
          );
        }

        return {
          ...anime,
          slug: slug || `anime-${anime.id}`,
          poster: this.getFullPosterUrl(anime.poster),
        };
      });
    } catch (error) {
      throw new Error(`Не удалось найти аниме: ${error.message}`);
    }
  }

  async getAnimeEpisodes(animeId: string) {
    try {
      const episodes = await this.prisma.episode.findMany({
        where: {
          animeId: animeId,
        },
        include: {
          translations: {
            include: {
              translator: true,
            },
          },
        },
        orderBy: {
          number: 'asc',
        },
      });

      return episodes;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getEpisodeTranslations(episodeId: string) {
    try {
      const translations = await this.prisma.translation.findMany({
        where: {
          episodeId: episodeId,
        },
        include: {
          translator: true,
        },
      });

      return translations;
    } catch (error) {
      this.logger.error(`Ошибка при получении переводов: ${error.message}`);
      throw new Error(`Не удалось получить переводы: ${error.message}`);
    }
  }

  async getLatestAnimes(limit?: number) {
    try {
      this.logger.log(`Получение последних аниме. Limit: ${limit}`);

      const validLimit = limit && limit > 0 && limit <= 100 ? limit : 20;
      this.logger.log(`Валидный limit: ${validLimit}`);

      const animes = await this.prisma.anime.findMany({
        where: {
          status: 'RELEASED',
          isDeleted: false,
          shikimoriRating: {
            gte: 8.0,
          },
          year: {
            gte: 2010,
          },
        },
        orderBy: [
          {
            shikimoriRating: 'desc',
          },
          {
            airedOn: 'desc',
          },
        ],
        take: validLimit,
        select: {
          id: true,
          shikimoriId: true,
          slug: true,
          nativeTitle: true,
          russianTitle: true,
          englishTitle: true,
          poster: true,
          type: true,
          status: true,
          year: true,
          shikimoriRating: true,
          airedOn: true,
        },
      });

      const result = animes.map((anime) => {
        // Если slug отсутствует, генерируем его на основе названия и shikimoriId
        let slug = anime.slug;
        if (!slug && anime.shikimoriId) {
          slug = this.generateSlug(
            anime.nativeTitle ||
              anime.russianTitle ||
              anime.englishTitle ||
              'anime',
            anime.shikimoriId,
          );
        }

        return {
          ...anime,
          slug: slug || `anime-${anime.id}`,
          poster: this.getFullPosterUrl(anime.poster),
        };
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Ошибка при получении последних аниме: ${error.message}`,
      );
      throw new Error(`Не удалось получить последние аниме: ${error.message}`);
    }
  }

  private formatAnimeResponse(anime: any) {
    return {
      ...anime,
      poster: this.getFullPosterUrl(anime.poster),
      banner: this.getFullPosterUrl(anime.banner),
      screenshots:
        anime.screenshots?.map((screenshot) => ({
          ...screenshot,
          originalUrl: this.getFullPosterUrl(screenshot.originalUrl),
          previewUrl: this.getFullPosterUrl(screenshot.previewUrl),
        })) || [],
      videos:
        anime.videos?.map((video) => ({
          ...video,
          imageUrl: this.getFullPosterUrl(video.imageUrl),
        })) || [],
      episodes:
        anime.episodes?.map((episode) => ({
          id: episode.id,
          number: episode.number,
          duration: episode.duration,
          createdAt: episode.createdAt,
          updatedAt: episode.updatedAt,
          screenshots:
            episode.screenshots?.map((screenshot) => ({
              ...screenshot,
              originalUrl: this.getFullPosterUrl(screenshot.originalUrl),
              previewUrl: this.getFullPosterUrl(screenshot.previewUrl),
            })) || [],
          translations:
            episode.translations?.map((translation) => {
              const source = translation.source as Record<string, any>;
              return {
                id: translation.id,
                type: translation.type,
                player: translation.player,
                translator: translation.translator,
                source: {
                  ...source,
                  quality:
                    translation.player === 'KODIK'
                      ? source?.quality
                      : translation.player === 'LIBRIA'
                        ? source?.quality || '1080p'
                        : 'unknown',
                },
                createdAt: translation.createdAt,
                updatedAt: translation.updatedAt,
              };
            }) || [],
        })) || [],
    };
  }

  async getAnimeByInternalId(id: string) {
    try {
      this.logger.log(`Получение информации о тайтле по внутреннему ID: ${id}`);

      const anime = await this.prisma.anime.findUnique({
        where: { id },
        include: {
          tags: true,
          studios: true,
          licensors: true,
          episodes: {
            orderBy: {
              number: 'asc',
            },
            include: {
              translations: {
                include: {
                  translator: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
              screenshots: {
                take: 5,
                orderBy: {
                  createdAt: 'desc',
                },
              },
            },
          },
          screenshots: {
            take: 10,
            orderBy: {
              createdAt: 'desc',
            },
          },
          videos: true,
        },
      });

      if (!anime) {
        this.logger.warn(`Аниме с ID ${id} не найдено в базе данных`);
        throw new Error('Аниме не найдено');
      }

      this.logger.debug(
        `Получены данные аниме: ${JSON.stringify({
          id: anime.id,
          title: anime.nativeTitle,
          episodesCount: anime.episodesCount,
          episodes: anime.episodes?.length,
        })}`,
      );

      return this.formatAnimeResponse(anime);
    } catch (error) {
      this.logger.error(
        `Ошибка при получении информации о тайтле: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Не удалось получить информацию о тайтле: ${error.message}`,
      );
    }
  }

  async getAnimeBySlug(slug: string) {
    try {
      if (!slug || slug === 'undefined' || slug.trim() === '') {
        throw new NotFoundException('Slug не может быть пустым');
      }

      this.logger.log(`Получение информации о тайтле по slug: ${slug}`);

      let anime = await this.prisma.anime.findUnique({
        where: { slug },
        include: {
          tags: true,
          studios: true,
          licensors: true,
          episodes: {
            orderBy: {
              number: 'asc',
            },
            include: {
              translations: {
                include: {
                  translator: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
              screenshots: {
                take: 5,
                orderBy: {
                  createdAt: 'desc',
                },
              },
            },
          },
          screenshots: {
            take: 10,
            orderBy: {
              createdAt: 'desc',
            },
          },
          videos: true,
        },
      });

      // Если не найдено по slug, пытаемся извлечь shikimoriId из slug
      // Формат slug: название-id (например: sousou-no-frieren-52991)
      if (!anime) {
        this.logger.warn(`Аниме с slug ${slug} не найдено в базе данных`);

        // Пытаемся извлечь ID из конца slug
        const slugParts = slug.split('-');
        const possibleId = parseInt(slugParts[slugParts.length - 1], 10);

        if (!isNaN(possibleId) && possibleId > 0) {
          this.logger.log(
            `Попытка найти аниме по shikimoriId: ${possibleId} из slug`,
          );

          try {
            // Используем существующий метод getAnimeById, который может создать запись
            const animeById = await this.getAnimeById(possibleId);

            // Если аниме было создано, получаем его с полными данными
            if (animeById) {
              anime = await this.prisma.anime.findUnique({
                where: { id: animeById.id },
                include: {
                  tags: true,
                  studios: true,
                  licensors: true,
                  episodes: {
                    orderBy: {
                      number: 'asc',
                    },
                    include: {
                      translations: {
                        include: {
                          translator: true,
                        },
                        orderBy: {
                          createdAt: 'desc',
                        },
                      },
                      screenshots: {
                        take: 5,
                        orderBy: {
                          createdAt: 'desc',
                        },
                      },
                    },
                  },
                  screenshots: {
                    take: 10,
                    orderBy: {
                      createdAt: 'desc',
                    },
                  },
                  videos: true,
                },
              });
            }
          } catch (error) {
            this.logger.warn(
              `Не удалось найти аниме по shikimoriId ${possibleId}: ${error.message}`,
            );
          }
        }
      }

      if (!anime) {
        throw new NotFoundException(`Аниме с slug "${slug}" не найдено`);
      }

      this.logger.debug(
        `Получены данные аниме: ${JSON.stringify({
          id: anime.id,
          title: anime.nativeTitle,
          episodesCount: anime.episodesCount,
          episodes: anime.episodes?.length,
        })}`,
      );

      return this.formatAnimeResponse(anime);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при получении информации о тайтле: ${error.message}`,
        error.stack,
      );
      throw new NotFoundException(
        `Не удалось получить информацию о тайтле: ${error.message}`,
      );
    }
  }

  async createEpisode(animeId: string, number: number, duration?: number) {
    try {
      this.logger.log(`Создание эпизода ${number} для аниме ${animeId}`);

      // Проверяем существование аниме
      const anime = await this.prisma.anime.findUnique({
        where: { id: animeId },
      });

      if (!anime) {
        throw new Error('Аниме не найдено');
      }

      // Проверяем, не существует ли уже эпизод с таким номером
      const existingEpisode = await this.prisma.episode.findFirst({
        where: {
          animeId,
          number,
        },
      });

      if (existingEpisode) {
        throw new Error(`Эпизод ${number} уже существует`);
      }

      // Создаем новый эпизод
      const episode = await this.prisma.episode.create({
        data: {
          number,
          duration,
          animeId,
        },
        include: {
          translations: {
            include: {
              translator: true,
            },
          },
        },
      });

      return episode;
    } catch (error) {
      this.logger.error(`Ошибка при создании эпизода: ${error.message}`);
      throw new Error(`Не удалось создать эпизод: ${error.message}`);
    }
  }

  async addTranslation(
    episodeId: string,
    translatorId: string,
    type: 'VOICE' | 'SUBTITLES',
    player: 'KODIK' | 'LIBRIA',
    source: any,
  ) {
    try {
      this.logger.log(`Добавление перевода для эпизода ${episodeId}`);

      // Проверяем существование эпизода
      const episode = await this.prisma.episode.findUnique({
        where: { id: episodeId },
      });

      if (!episode) {
        throw new Error('Эпизод не найден');
      }

      // Проверяем существование переводчика
      const translator = await this.prisma.translator.findUnique({
        where: { id: translatorId },
      });

      if (!translator) {
        throw new Error('Переводчик не найден');
      }

      // Проверяем, не существует ли уже такой перевод
      const existingTranslation = await this.prisma.translation.findFirst({
        where: {
          episodeId,
          translatorId,
          type,
          player,
        },
      });

      if (existingTranslation) {
        throw new Error('Такой перевод уже существует');
      }

      // Создаем новый перевод
      const translation = await this.prisma.translation.create({
        data: {
          type,
          player,
          source,
          episodeId,
          translatorId,
        },
        include: {
          translator: true,
        },
      });

      return translation;
    } catch (error) {
      this.logger.error(`Ошибка при добавлении перевода: ${error.message}`);
      throw new Error(`Не удалось добавить перевод: ${error.message}`);
    }
  }

  async updateEpisodes(animeId: string) {
    try {
      this.logger.log(`Обновление эпизодов для аниме ${animeId}`);

      const anime = await this.prisma.anime.findUnique({
        where: { id: animeId },
      });

      if (!anime) {
        throw new Error('Аниме не найдено');
      }

      if (!anime.episodesCount || anime.episodesCount <= 0) {
        throw new Error('Количество эпизодов не указано');
      }

      // Получаем существующие эпизоды
      const existingEpisodes = await this.prisma.episode.findMany({
        where: { animeId },
        select: { number: true },
      });

      const existingNumbers = new Set(existingEpisodes.map((ep) => ep.number));

      // Создаем только отсутствующие эпизоды
      const newEpisodes = Array.from(
        { length: anime.episodesCount },
        (_, i) => i + 1,
      )
        .filter((number) => !existingNumbers.has(number))
        .map((number) => ({
          number,
          duration: anime.duration,
          animeId,
        }));

      if (newEpisodes.length > 0) {
        this.logger.log(
          `Создаем ${newEpisodes.length} новых эпизодов для аниме ${anime.nativeTitle}`,
        );
        await this.prisma.episode.createMany({
          data: newEpisodes,
        });
      }

      // Получаем обновленный список эпизодов
      const updatedEpisodes = await this.prisma.episode.findMany({
        where: { animeId },
        include: {
          translations: {
            include: {
              translator: true,
            },
          },
        },
        orderBy: {
          number: 'asc',
        },
      });

      return updatedEpisodes;
    } catch (error) {
      this.logger.error(`Ошибка при обновлении эпизодов: ${error.message}`);
      throw new Error(`Не удалось обновить эпизоды: ${error.message}`);
    }
  }

  async updateDescriptions(limit?: number) {
    try {
      this.logger.log('Начало обновления описаний для аниме');

      // Получаем все аниме без описания
      const animesWithoutDescription = await this.prisma.anime.findMany({
        where: {
          OR: [{ description: null }, { description: '' }],
        },
        select: {
          id: true,
          shikimoriId: true,
          nativeTitle: true,
        },
        take: limit || 1000,
      });

      this.logger.log(
        `Найдено ${animesWithoutDescription.length} аниме без описания`,
      );

      let updatedCount = 0;
      let failedCount = 0;

      for (const anime of animesWithoutDescription) {
        try {
          this.logger.debug(
            `Обновление описания для аниме ${anime.nativeTitle} (ID: ${anime.shikimoriId})`,
          );

          const description = await this.getAnimeDescription(anime.shikimoriId);

          if (description) {
            await this.prisma.anime.update({
              where: { id: anime.id },
              data: { description },
            });

            updatedCount++;
            this.logger.log(`✓ Описание обновлено для: ${anime.nativeTitle}`);
          } else {
            this.logger.warn(
              `Описание не найдено для: ${anime.nativeTitle} (ID: ${anime.shikimoriId})`,
            );
            failedCount++;
          }

          // Задержка между запросами, чтобы не перегружать API
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          this.logger.error(
            `Ошибка при обновлении описания для аниме ${anime.shikimoriId}: ${error.message}`,
          );
          failedCount++;
        }
      }

      this.logger.log(
        `Обновление описаний завершено. Обновлено: ${updatedCount}, Ошибок: ${failedCount}`,
      );

      return {
        success: true,
        total: animesWithoutDescription.length,
        updated: updatedCount,
        failed: failedCount,
        message: `Обновлено описаний: ${updatedCount} из ${animesWithoutDescription.length}`,
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при обновлении описаний: ${error.message}`,
        error.stack,
      );
      throw new Error(`Не удалось обновить описания: ${error.message}`);
    }
  }
}
