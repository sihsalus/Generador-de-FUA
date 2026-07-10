
import BaseEntity, { BaseEntityInterface } from "./BaseEntity";

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

    }

};

export default FUAMapping;