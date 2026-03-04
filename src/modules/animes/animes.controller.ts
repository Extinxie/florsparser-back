import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { AnimesService } from './animes.service';

@Controller('animes')
export class AnimesController {
  constructor(private readonly animesService: AnimesService) {}

  @Get()
  async getAllAnimes() {
    return this.animesService.parseAllAnimes();
  }

  @Get('search')
  async searchAnimes(@Query('q') query: string) {
    return this.animesService.searchAnimes(query);
  }

  @Get('latest')
  async getLatestAnimes(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.animesService.getLatestAnimes(limit);
  }

  @Get('/:slug')
  async getAnimeBySlug(@Param('slug') slug: string) {
    if (!slug || slug === 'undefined' || slug.trim() === '') {
      throw new BadRequestException();
    }
    return this.animesService.getAnimeBySlug(slug);
  }

  @Get('episodes/:episodeId/translations')
  async getEpisodeTranslations(@Param('episodeId') episodeId: string) {
    return this.animesService.getEpisodeTranslations(episodeId);
  }

  @Get('by-id/:id')
  async getAnimeByInternalId(@Param('id') id: string) {
    return this.animesService.getAnimeByInternalId(id);
  }

  @Get(':id/episodes')
  async getAnimeEpisodes(@Param('id') id: string) {
    return this.animesService.getAnimeEpisodes(id);
  }

  @Get(':id')
  async getAnimeById(@Param('id', ParseIntPipe) id: number) {
    return this.animesService.getAnimeById(id);
  }

  @Post('parse')
  async parseAnimes() {
    return this.animesService.parseAllAnimes();
  }

  @Post('parse-all')
  async parseAllAnimes() {
    return this.animesService.parseAllAnimes();
  }

  @Post(':animeId/episodes')
  async createEpisode(
    @Param('animeId') animeId: string,
    @Body() body: { number: number; duration?: number },
  ) {
    return this.animesService.createEpisode(
      animeId,
      body.number,
      body.duration,
    );
  }

  @Post('episodes/:episodeId/translations')
  async addTranslation(
    @Param('episodeId') episodeId: string,
    @Body()
    body: {
      translatorId: string;
      type: 'VOICE' | 'SUBTITLES';
      player: 'KODIK' | 'LIBRIA';
      source: any;
    },
  ) {
    return this.animesService.addTranslation(
      episodeId,
      body.translatorId,
      body.type,
      body.player,
      body.source,
    );
  }

  @Post(':animeId/episodes/update')
  async updateEpisodes(@Param('animeId') animeId: string) {
    return this.animesService.updateEpisodes(animeId);
  }

  @Post('update-descriptions')
  async updateDescriptions(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.animesService.updateDescriptions(limit);
  }
}
