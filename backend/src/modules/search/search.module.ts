import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PerplexityService } from './perplexity/perplexity.service';
import { SimilarContract } from '../../entities/similar-contract.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SimilarContract])],
  controllers: [SearchController],
  providers: [SearchService, PerplexityService],
  exports: [SearchService, PerplexityService],
})
export class SearchModule {}
