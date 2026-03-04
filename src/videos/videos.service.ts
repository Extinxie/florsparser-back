import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);
  private readonly kodikApiKey = process.env.KODIK_API_KEY;
  private readonly anilibriaApiUrl = 'https://anilibria.tv/api/v2';

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async getVideoSource(translationId: string) {
    try {
      const translation = await this.prisma.translation.findUnique({
        where: { id: translationId },
        include: {
          episode: {
            include: {
              anime: true,
            },
          },
        },
      });

      if (!translation) {
        throw new Error('Перевод не найден');
      }

      switch (translation.player) {
        case 'KODIK':
          return await this.getKodikSource(translation);
        case 'LIBRIA':
          return await this.getAnilibriaSource(translation);
        default:
          return translation.source;
      }
    } catch (error) {
      throw error;
    }
  }

  private async getKodikSource(translation: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://kodikapi.com/search', {
          params: {
            token: this.kodikApiKey,
            shikimori_id: translation.episode.anime.shikimoriId,
            episode: translation.episode.number,
            translation_id: translation.source.translationId,
            quality: translation.source.quality,
          },
        }),
      );

      if (!response.data || !response.data.results?.[0]?.link) {
        throw new Error('Не удалось получить ссылку на видео');
      }

      return {
        type: 'kodik',
        url: response.data.results[0].link,
        quality: translation.source.quality,
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при получении Kodik источника: ${error.message}`,
      );
      throw error;
    }
  }

  private async getAnilibriaSource(translation: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.anilibriaApiUrl}/getTitle`, {
          params: {
            id: translation.source.videoId,
          },
        }),
      );

      if (!response.data || !response.data.player?.playlist) {
        throw new Error('Не удалось получить информацию о видео');
      }

      const playlist = response.data.player.playlist;
      const quality = translation.source.quality || '1080p';
      const video = playlist[quality] || playlist[Object.keys(playlist)[0]];

      return {
        type: 'hls',
        url: video.hls,
        quality: quality,
        subtitles: response.data.player.subtitles?.map((sub) => ({
          lang: sub.lang,
          url: sub.url,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при получении Anilibria источника: ${error.message}`,
      );
      throw error;
    }
  }
}
