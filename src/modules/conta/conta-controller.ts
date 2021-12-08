import { Request, Response } from 'express';
import { INovaConta } from '../../interfaces/conta-create-interface';
import { IFiltroConta } from '../../interfaces/conta-filter-interface';
import { IUpdateConta } from '../../interfaces/conta-update-interface';
import { LIMIT_DEFAULT, LIMIT_MAXIMO } from '../../utils/consts';
import { EnumSituacaoConta } from '../../utils/enums';
import TenantsSerive from '../../utils/tenants-service';
import { Conta } from './conta-model';

export default class ContaController {

    constructor() { };

    async find(request: Request, response: Response) {
        try {
            const filters: IFiltroConta = request.query as any;

            const query = Conta.query();
            const limit: number = filters.limit && !isNaN(+filters.limit) && filters.limit < LIMIT_MAXIMO ? +filters.limit : LIMIT_DEFAULT;
            const offset: number = filters.offset || 0;

            if (filters.descricao) {
                query.where('descricao', 'like', `${filters.descricao}%`);
            }

            if (!isNaN(+filters.situacao) && filters.situacao !== null && filters.situacao !== undefined
                && (filters.situacao as any) !== '') {
                query.where('situacao', filters.situacao);
            }

            TenantsSerive.aplicarTenantRepublica(request.perfil.tipoPerfil, query, request.usuario.republicaId);
            const contas = await query.select().limit(limit).offset(offset);

            return response.status(200).send(contas);
        } catch (error: any) {
            return response.status(400).json({ error: 'Erro ao consultar contas', message: error.message });
        }
    }

    async findOne(request: Request, response: Response) {
        try {
            const contaId = request.params.id;
            if (isNaN(+contaId) || contaId === null || contaId === undefined) {
                throw new Error('Id (identificador) informado é inválido!');
            }

            const query = Conta.query();
            TenantsSerive.aplicarTenantRepublica(request.perfil.tipoPerfil, query, request.usuario.republicaId);
            query.where('id', contaId);
            const conta = await query.select();

            return response.status(200).send(Array.isArray(conta) && conta.length > 0 ? conta[0] : null);
        } catch (error: any) {
            return response.status(400).json({ error: 'Erro ao consultar a conta', message: error.message });
        }
    }

    async create(request: Request, response: Response) {
        try {
            const dados: INovaConta = request.body;
            const novaConta = await Conta.query().insert({
                descricao: dados.descricao,
                valor: dados.valor,
                mesAnoConta: dados.mesAnoConta,
                situacao: EnumSituacaoConta.EmAberto,
                divisaoPorIgualEntreMoradores: dados.divisaoPorIgualEntreMoradores,
                republicaId: +request.republica.id
            });

            return response.status(201).send(novaConta);
        } catch (error: any) {
            return response.status(400).json({ error: 'Erro ao criar conta', message: error.message });
        }
    }

    async upsert(request: Request, response: Response) {
        try {
            const contaId = request.params.id;
            if (isNaN(+contaId) || contaId === null || contaId === undefined) {
                throw new Error('Id (identificador) informado é inválido!');
            }

            const dados: IUpdateConta = request.body;

            const conta = await Conta.query().findById(contaId);

            if (conta) {
                if (+request.usuario.republicaId !== +conta.republicaId) {
                    return response.status(401).send('Seu usuário não pode alterar informações da conta informada!');
                }

                await Conta.query()
                    .findById(conta.id as number)
                    .patch({
                        descricao: dados.descricao,
                        valor: dados.valor,
                        situacao: dados.situacao
                    });
            } else {
                throw new Error('Não existe uma conta para o id (identificador) informado!');
            }

            return response.status(200).send(true);
        } catch (error: any) {
            return response.status(400).json({ error: 'Erro ao atualizar conta', message: error.message });
        }
    }

    async delete(request: Request, response: Response) {
        try {
            const contaId = request.params.id;
            if (isNaN(+contaId) || contaId === null || contaId === undefined) {
                throw new Error('Id (identificador) informado é inválido!');
            }

            const conta = await Conta.query().findById(contaId);

            if (conta) {
                if (+request.usuario.republicaId !== +conta.republicaId) {
                    return response.status(401).send('Seu usuário não pode deletar a conta informado!');
                }

                await conta.$query().delete();
            } else {
                return response.status(204).send('Não existe uma conta para o id (identificador) informado!');
            }

            return response.status(200).send(true);
        } catch (error: any) {
            return response.status(400).json({ error: 'Erro ao deletar conta', message: error.message });
        }
    }

}