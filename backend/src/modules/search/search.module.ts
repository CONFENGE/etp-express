import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { ExaService } from './exa/exa.service';
import { SimilarContract } from '../../entities/similar-contract.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SimilarContract])],
  controllers: [SearchController],
  providers: [SearchService, ExaService],
  exports: [SearchService, ExaService],
})
export class SearchModule {}
