
import { sumAux } from "../services/SETISIS_PackageGenerator";
import BaseEntity, { BaseEntityInterface } from "./BaseEntity";

import * as vm from 'vm';

export interface FUAMappingInterface extends BaseEntityInterface {
    name: string;
    code: string;
}

class FUAMapping extends BaseEntity {
    name: string;
    code: string;

    constructor(data: FUAMappingInterface){
        super(data);

        this.name = data.name;
        this.code = data.code;
    }

    public async execute(
        utils: any,

    ){
        const context = { module: { exports: {} as any }, exports: {} as any };

    }

};

export default FUAMapping;