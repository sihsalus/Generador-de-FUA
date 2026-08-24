
import BaseFieldFormEntity, { BaseFieldFormEntityInterface } from "./BaseFieldFormEntity";
import FUAPage, { FUAPageInterface } from "./FUAPage";
import { any, z } from "zod";
import { FUAPageSchema } from "./FUAPage";
import FUARenderingUtils from "../utils/FUARendering";
import { parse, printParseErrorCode } from "jsonc-parser";



export interface FUAFormatInterface extends BaseFieldFormEntityInterface{
    name: string;
    pages?: Array<FUAPage>;
    content?: string; // Only from DB
};

export const FUAFormatSchema = z.object({
    name: z.string(),
    pages: z.array(z.any()).optional(),
    content: z.string().optional(), // Only from DB
});


class FUAFormat extends BaseFieldFormEntity {
    name: string;
    pages: Array<FUAPage>;


    constructor(aux: FUAFormatInterface) {
        const result = FUAFormatSchema.safeParse(aux);
        if (!result.success) {
            const newError = new Error('Error in FUA Format (object) - Invalid FUAFormatInterface - constructor');
            (newError as any).details = result.error;
            throw newError;
        }
        super(aux);
        this.name = aux.name;
        let auxContent = null;
        
        // Only in the case that the object comes from from DB content wont be null
        if(aux.content !== undefined){
            auxContent = parse(aux.content ?? '');
            aux.pages = auxContent.pages;
        }

        this.pages = new Array<FUAPage>(); 
        // Build the sons objects
        if(aux.pages){
            aux.pages.forEach( (auxPage : FUAPage, index : number) => {
                try {
                    const auxNewpage = new FUAPage(auxPage as FUAPageInterface, index);
                    this.pages.push(auxNewpage);
                }catch(error: unknown){
                    console.error(`Error in FUAFormat constructor (page: ${index}) - creatingPages: `, error);
                    (error as Error).message =  `Error in FUAFormat constructor (page: ${index}) - creatingPages: ` + (error as Error).message;
                    throw error;
                }                
            })         
        }
    }


    // From FUAFORMAT from json.c
    /*
    id, uuid, etc
    */

    // From FUAFORMAT from DB
    /*
        id, uuid, etc already exists, some of the information of the objext is in content as string
        for example, pages are in string form in content
    */

    

    get getName() { return this.name; }
    set setName(value: string) { this.name = value; }

    get getPages() { return this.pages; }
    set setPages(value: Array<FUAPage>) { this.pages = value; }

    public async renderHtmlContent(printMode : boolean, mapping?: any, printReference? : boolean ) : Promise<string> {
        try{
            const content =  await FUARenderingUtils.renderFUAFormatFromSchema(this, printMode, mapping, printReference);
            return content;
        }catch(err : any){
            console.error(err);
            throw err;
        }
    } 
}

export default FUAFormat;