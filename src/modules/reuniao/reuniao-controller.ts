import { Request, Response } from 'express';
import { INovaReuniao } from '../../interfaces/reuniao-create-interface';
import { IFiltroReuniao } from '../../interfaces/reuniao-filter-interface';
import { IUpdateReuniao } from '../../interfaces/reuniao-update-interface';
import { LIMIT_DEFAULT, LIMIT_MAXIMO } from '../../utils/consts';
import TenantsSerive from '../../utils/tenants-service';
import { Reuniao } from './reuniao-model';

export default class ReuniaoController {

    constructor() { };

    async find(request: Request, response: Response) {
        try {
            const filters: IFiltroReuniao = request.query as any;
            const limit: number = filters.limit && !isNaN(+filters.limit) && filters.limit < LIMIT_MAXIMO ?
                +filters.limit : LIMIT_DEFAULT;
            const offset: number = filters.offset || 0;

            const query = Reuniao.query();
            const queryCount = Reuniao.query();

            if (filters.descricao) {
                query.where('descricao', 'like', `${filters.descricao}%`);
                queryCount.where('descricao', 'like', `${filters.descricao}%`);
            }

            if (filters.data) {
                filters.data = Array.isArray(filters.data) ? filters.data :
                    (filters.data as string).split(',');
                query.whereBetween('data', [new Date(filters.data[0]),
                new Date(filters.data[1])] as any);
                queryCount.whereBetween('data', [new Date(filters.data[0]),
                new Date(filters.data[1])] as any);
            }

            TenantsSerive.aplicarTenantRepublica(request.perfil.tipoPerfil, query,
                request.usuario.republicaId);
            TenantsSerive.aplicarTenantRepublica(request.perfil.tipoPerfil, queryCount,
                request.usuario.republicaId);

            const reunioes = await query.select().limit(limit).offset(offset).orderBy('id');
            const count: any[] = await queryCount.select().count();

            return response.status(200).send({
                rows: reunioes,
                count: Array.isArray(count) && count.length > 0 ?
                    +count[0].count : 0
            });
        } catch (error: any) {
            return response.status(400).json({ error: 'Erro ao consultar reuni??es', message: error.message });
        }
    }

    async findOne(request: Request, response: Response) {
        try {
            const reuniaoId = request.params.id;
            if (isNaN(+reuniaoId) || reuniaoId === null || reuniaoId === undefined) {
                throw new Error('Id (identificador) informado ?? inv??lido!');
            }

            const query = Reuniao.query();
            TenantsSerive.aplicarTenantRepublica(request.perfil.tipoPerfil, query, request.usuario.republicaId);
            query.where('id', reuniaoId);
            const reuniao = await query.select();

            return response.status(200).send(Array.isArray(reuniao) && reuniao.length > 0 ? reuniao[0] : null);
        } catch (error: any) {
            return response.status(400).json({ error: 'Erro ao consultar a reuni??o', message: error.message });
        }
    }

    async create(request: Request, response: Response) {
        try {
            const dados: INovaReuniao = request.body;

            if (!dados.data) {
                throw new Error('Data da reuni??o ?? obrigat??ria!')
            }

            const novaReuniao = await Reuniao.query().insert({
                descricao: dados.descricao,
                anotacoes: dados.anotacoes,
                data: dados.data,
                republicaId: request.republica.id
            });

            return response.status(201).send(novaReuniao);
        } catch (error: any) {
            return response.status(400).json({ error: 'Erro ao criar reuni??o', message: error.message });
        }
    }

    async upsert(request: Request, response: Response) {
        try {
            const reuniaoId = request.params.id;
            if (isNaN(+reuniaoId) || reuniaoId === null || reuniaoId === undefined) {
                throw new Error('Id (identificador) informado ?? inv??lido!');
            }

            const dados: IUpdateReuniao = request.body;

            const reuniao = await Reuniao.query().findById(reuniaoId);

            if (reuniao) {
                if (+request.usuario.republicaId !== +reuniao.republicaId) {
                    return response.status(401).send('Seu usu??rio n??o pode alterar informa????es da reuni??o informada!');
                }

                await Reuniao.query()
                    .findById(reuniaoId)
                    .patch({
                        descricao: dados.descricao,
                        anotacoes: dados.anotacoes,
                        data: dados.data
                    });
            } else {
                throw new Error('N??o existe uma reuni??o para o id (identificador) informado!');
            }

            return response.status(200).send(true);
        } catch (error: any) {
            return response.status(400).json({ error: 'Erro ao atualizar reuni??o', message: error.message });
        }
    }

    async delete(request: Request, response: Response) {
        try {
            const reuniaoId = request.params.id;
            if (isNaN(+reuniaoId) || reuniaoId === null || reuniaoId === undefined) {
                throw new Error('Id (identificador) informado ?? inv??lido!');
            }

            const reuniao = await Reuniao.query().findById(reuniaoId);

            if (reuniao) {
                if (+request.usuario.republicaId !== +reuniao.republicaId) {
                    return response.status(401).send('Seu usu??rio n??o pode deletar a reuni??o informado!');
                }

                await Reuniao.query().deleteById(reuniao.id as number);
            } else {
                return response.status(204).send('N??o existe uma reuni??o para o id (identificador) informado!');
            }

            return response.status(200).send(true);
        } catch (error: any) {
            return response.status(400).json({ error: 'Erro ao deletar reuni??o', message: error.message });
        }
    }

}