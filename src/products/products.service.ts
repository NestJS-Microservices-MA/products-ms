import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductsService');

  onModuleInit() {
      this.$connect();
      this.logger.log('Database connected');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({ data: createProductDto });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;
    const totalResults = await this.product.count({
      where: { available: true }
    });
    const lastPage = Math.ceil(totalResults / limit);
  
    return {
      data: await this.product.findMany({
        where: {
          available: true
        },
        take: limit,
        skip: (page - 1) * limit,
      }),
      meta: {
        total: totalResults,
        page,
        lastPage,
      }
    }
  }

  async findOne(id: number) {
    const product = await this.product.findFirst({ where: { id, available: true } });
  
    if (!product) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Product with id #${id} not found`,
      });
    }
  
    return product;
  }

  async update(updateProductDto: UpdateProductDto) {
    const { id, ...rest } = updateProductDto;
  
    await this.findOne(id);
  
    return this.product.update({
      where: { id },
      data: rest,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const product = await this.product.update({
      where: { id },
      data: { available: false }
    });
  
    return product;
  }

  async validateProducts(ids: number[]) {
    ids = [...new Set(ids)]; // Prevent duplicates
  
    const products = await this.product.findMany({
      where: {
        id: {
          in: ids,
        },
        available: true
      }
    });
  
    if (products.length !== ids.length) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Some products were not found',
      });
    }
  
    return products;
  }
}
