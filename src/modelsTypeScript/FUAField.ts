import { Field } from "multer";
import BaseFieldFormEntity, { BaseFieldFormEntityInterface } from "./BaseFieldFormEntity";
import FUARenderingUtils from "../utils/FUARendering";
import {z} from "zod";

export interface FUAFieldInterface extends BaseFieldFormEntityInterface{
    top: number;
    left: number;
    width: number;
    height: number;
    extraStyles?: string;
    showLabel: boolean;
    labelHeight?: number;
    labelWidth?: number;
    label: string;
    labelPosition?: string;
    labelExtraStyles?: string;
    valueType: string; //
};

export const FUAFieldSchema = z.object({
  top: z.number(),
  left: z.number(),
  width: z.number(),
  height: z.number(),
  extraStyles: z.string().optional(),
  showLabel: z.boolean(),
  labelHeight: z.number().optional(),
  label: z.string().optional(),
  labelPosition: z.string().optional(),
  labelExtraStyles: z.string().optional(),
  valueType: z.string(),
});



interface FUAField_TableInterface extends FUAFieldInterface {
    valueType: "Table";
    columns: Array<any>;
    rows: Array<any>;
};

interface FUAField_BoxInterface extends FUAFieldInterface {
    valueType: "Box";
    text: string;
};

interface FUAField_FieldInterface extends FUAFieldInterface {
    valueType: "Field";
    fields: Array<FUAField_Field | FUAField_Box | FUAField_Table>; 
};

export const FUAFieldTableSchema = FUAFieldSchema.extend({
    valueType: z.literal("Table"),
    columns: z.array(z.any()),
    rows: z.array(z.any()),
});

export const FUAFieldBoxSchema = FUAFieldSchema.extend({
    valueType: z.literal("Box"),
    text: z.string().optional()
});

export const FUAFieldFieldSchema = FUAFieldSchema.extend({
    valueType: z.literal("Field"),
    fields: z.array(z.any())
});


function tablerenderer_row( auxRow : any, index : number, colAmount : number, prefix: string, printMode : boolean, mapping?: any) : string {
    let htmlContent = '';
    // no columns, return ''
    if( colAmount === 0 ) return '';
    
    // Row height
    let height = `style="height: ${auxRow.height}mm;"`;

    // Get cell if the are
    let cells = auxRow.cells ?? null;
    let rowContent = [];
    for(let i = 0; i < colAmount; i++ ){
        let extraStyles = '';
        if( cells !== null){
            extraStyles = `
            <style>
                #${prefix}-row-${index}-cell-${i} {
                    ${cells?.[i]?.extraStyles ?? ''},
                    min-width: 0;
                }
            </style>
            `;
        }
        // Text from mapping
        let textFromMapping = '';
        if(mapping !== undefined){
            textFromMapping = mapping.find( (aux: any) => aux.column === i+1)?.valueToPut
        }
        let auxCellContent = `
            ${extraStyles}
            <td id="${prefix}-row-${index}-cell-${i}" class="field-border text-container ${printMode ? 'format-related-print' : ''}" > 
                ${cells?.[i]?.text ?? ''} ${textFromMapping ?? ''}
            </td>
        `;
        rowContent.push(auxCellContent);
    }

    htmlContent = `
        <tr ${height} class="field-border ${printMode ? 'format-related-print' : ''}">
            ${rowContent.length > 0 ? rowContent.join('') : ''}
        </tr>
    `;

    return htmlContent;
};


function fieldRenderer(field: FUAField, fieldIndex: number, prefix: string, printMode: boolean) : string {
    // ...field rendering logic...
    return "<!-- Field HTML -->";
};



/*

Table, Box, Field

FUAField -> box, table, etc

FueField -> string

if FUAField.valueType == box
    renderbox
if FUAField.valueType == table
    renderTable
if FUAField.valueType == etc
    renderetc

renderTypeField
    FuaField ? box -> FUAFieldBox.render
    FuaField ? table -> FUAFieldTable.render
    FuaField ? etc -> FUAFieldEtc.render

renderTypeField(FUAField).render

*/


/*
    FINAL DESIRED FLOW
    FUAFIELD .renderContent
        const a = .label (renderLabel)
        const b = .extraStyles (renderExtraStyles)
        const c = .content (with dependency) (render)
        return a + b + c (string)
*/

//const aux = new FUAField();

export abstract class FUAField extends BaseFieldFormEntity  {
    // Label attributes
    top: number;
    left: number;
    width: number;
    height: number;
    extraStyles?: string; // <- stated by .json.c file, we cant touch them
    showLabel: boolean;
    labelWidth?: number;
    labelHeight?: number;
    label: string;
    labelPosition?: string;
    labelExtraStyles?: string;
    valueType: string;    

    constructor(aux: FUAFieldInterface, index?: number) {
        const result = FUAFieldSchema.safeParse(aux);
        if (!result.success) {
            const newError = new Error(`Error in FUA Field (object) - Invalid FUAFieldIterface - constructor`);
            (newError as any).details = result.error;
            throw newError;
        }
        
        super(aux);
        this.top = aux.top;
        this.left = aux.left;
        this.width = aux.width;
        this.height = aux.height;
        this.extraStyles = aux.extraStyles;
        this.showLabel = aux.showLabel;
        this.labelWidth = aux.labelWidth;
        this.labelHeight = aux.labelHeight;
        this.label = aux.label;
        this.labelPosition = aux.labelPosition;
        this.labelExtraStyles = aux.labelExtraStyles;
        this.valueType = aux.valueType;
    }

    get getTop() { return this.top; }
    set setTop(value: number) { this.top = value; }

    get getLeft() { return this.left; }
    set setLeft(value: number) { this.left = value; }

    get getWidth() { return this.width; }
    set setWidth(value: number) { this.width = value; }

    get getHeight() { return this.height; }
    set setHeight(value: number) { this.height = value; }

    get getExtrasStyles() { return this.extraStyles; }
    set setExtrasStyles(value: string | undefined) { this.extraStyles = value; }

    get getShowLabel() { return this.showLabel; }
    set setShowLabel(value: boolean) { this.showLabel = value; }

    get getLabelHeight() { return this.labelHeight; }
    set setLabelHeight(value: number) { this.labelHeight = value; }

    get getLabelWidth() { return this.labelWidth; }
    set setLabelWidth(value: number) { this.labelWidth = value; }

    get getLabel() { return this.label; }
    set setLabel(value: string) { this.label = value; }

    get getlabelPosition() { return this.labelPosition; }
    set setlabelPosition(value: string | undefined) { this.labelPosition = value; }

    get getLabelExtraStyles() { return this.labelExtraStyles; }
    set setLabelExtraStyles(value: string | undefined) { this.labelExtraStyles = value; }

    get getValueType() { return this.valueType; }
    set setValueType(value: string) { this.valueType = value; }

    // Common methods
    renderLabel(prefix : string, printMode : boolean, fieldIndex : number) : any {
        
        return FUARenderingUtils.renderFUAFieldFromSchema_renderLabel(this, prefix, printMode, fieldIndex);
    }

    renderContent(fieldIndex: number, prefix: string, printMode : boolean, mapping?: any) : string {        
        let logicAditionalStyles = { value: '' };
        let fieldContent = this.render(fieldIndex, prefix, printMode, logicAditionalStyles, mapping)
        let auxLabel = this.renderLabel(prefix, printMode, fieldIndex);
        let labelContent = auxLabel.labelContent;
        
        let finalContent = ``;
        
        finalContent = `
            <style>
                #${prefix}-field-${fieldIndex} {
                    top:    ${this.top.toFixed(1)}mm;
                    left:   ${this.left.toFixed(1)}mm;
                    ${this.extraStyles ?? ''} 
                }
                #${prefix}-field-${fieldIndex}-content {
                    ${logicAditionalStyles.value} 
                }
            </style>
            <div id="${prefix}-field-${fieldIndex}" style="position: absolute; width: min-content; border: none; padding: 0; background: none; display: flex; ${auxLabel.flexDir ? `flex-direction: ${auxLabel.flexDir}; position: absolute;` : ''}" >
                ${this.labelPosition === 'Top' || this.labelPosition === 'Left' ? labelContent : ''}
                <table id="${prefix}-field-${fieldIndex}-content" class="table-field" >                    
                    ${fieldContent}
                </table>
                ${this.labelPosition === 'Bottom' || this.labelPosition === 'Right' ? labelContent : ''}        
                
            </div>
        `;
        return finalContent;
    }

    // Overwrite methods
    abstract render(fieldIndex: number, prefix: string, printMode: boolean, logicAditionalStyles : { value: string; }, mapping?: any): string;
    
    static buildFUAField( newField : any , index: number ) : FUAField_Box | FUAField_Field | FUAField_Table | null {
        try{
            switch(newField.valueType){
                case "Table":
                    return new FUAField_Table(newField as FUAField_TableInterface);
                case "Box":
                    return new FUAField_Box(newField as FUAField_BoxInterface);
                case "Field":
                    return  new FUAField_Field(newField as FUAField_FieldInterface, index);
                default:
                    return null;
            }
        }catch(error: unknown){
            console.error(`Error in FUAField constructor - buildFUAField: `, error);
            (error as Error).message =  `Error in FUAField constructor  - buildFUAField: ` + (error as Error).message;
            throw error;
        }        
    }
}

export class FUAField_Box extends FUAField {

    //private valueType: "Box";
    private text?: string;

    constructor(aux: FUAField_BoxInterface) {
        const result = FUAFieldBoxSchema.safeParse(aux);
        if (!result.success) {
            const newError = new Error('Error in FUA Field (constructor) - Invalid FUAFieldBoxInterface - constructor');
            (newError as any).details = result.error;
            throw newError;
        }
        super(aux as FUAFieldInterface);
        this.valueType = aux.valueType;
        this.text = aux.text;
    }

    get getText(): string | undefined {
        return this.text;
    }
    set setText(value: string | undefined) {
        this.text = value;
    }

    //Overriden method
    render(fieldIndex: number, prefix: string, printMode: boolean, logicAditionalStyles : { value: string; }, mapping?: any): string {
        // If theres a mapping 
        
        // Dont forget to add width in logicAditionalStyles
        let fieldContent = `
            <tr>
                <td class="text-container ${printMode ? 'format-related-print' : ''}"> ${this.text ?? ''} ${mapping?.mappings?.[0]?.valueToPut ?? ''}</td>
            </tr>
        `;
        logicAditionalStyles.value += `
            width:  ${this.width.toFixed(1)}mm;    
            height: ${this.height.toFixed(1)}mm;  
        `;
        return fieldContent;
    }
}

export class FUAField_Table extends FUAField {

    // Special Attributes
    // valueType is "Table"
    private columns: Array<any>;
    private rows: Array<any>;

    // Constructor
    constructor(aux: FUAField_TableInterface) {
        (aux as FUAFieldInterface).width = 0.0;
        (aux as FUAFieldInterface).height = 0.0;
        const result = FUAFieldTableSchema.safeParse(aux);
        if (!result.success) {
            const newError = new Error('Error in FUA Field (constructor) - Invalid FUAFieldTableInterface - constructor');
            (newError as any).details = result.error;
            throw newError;
        }
        super(aux as FUAFieldInterface);
        this.columns = aux.columns;
        this.rows = aux.rows;
        
    }

    // Methods
    get getColumns(): any {
        return this.columns;
    }

    set setColumns(value: any){
        this.columns = value;
    }

    //Overriden method
    render(fieldIndex: number, prefix: string, printMode: boolean, logicAditionalStyles : { value: string; }, mapping?: any): string {        
        // If theres a mapping
        
        let auxWidthValue = 0.0;
        // Define colgroups
        let auxColumns = this.columns.map((item: any) => `<col style="width: ${item.width.toFixed(1)}mm;" />` );          
        let colgroups  = `
            <colgroup>
                ${auxColumns.join('')}
            </colgroup>
        `;
        auxWidthValue = this.columns.reduce((auxWidthValue: number, obj: any) => auxWidthValue + parseFloat(obj.float || 0), 0);
        logicAditionalStyles.value += `
            width: ${auxWidthValue.toFixed(1)}mm; 
        `;

        // Defining rows, ordered by 'index' attribute
        let auxRows = this.rows.sort( (a: any, b: any) => ( a.index - b.index ) );
        // Process row renderFUAFieldTableRowFromSchema
        
        auxRows = auxRows.map( (row: any, index: number) => tablerenderer_row(
            row, 
            index, 
            auxColumns.length,
            `${prefix}-field-${fieldIndex}`, 
            printMode,
            mapping?.mappings?.filter( (auxMapping: any) => auxMapping.row === (index + 1) )
        ) );
        
        return colgroups + auxRows.join('');      
    }
}

export class FUAField_Field extends FUAField {

    private fields: Array<FUAField_Field | FUAField_Box | FUAField_Table>; 

    constructor(aux: FUAField_FieldInterface, index: number) {
        const result = FUAFieldFieldSchema.safeParse(aux);
        if (!result.success) {
            const newError = new Error('Error in FUA Field (constructor) - Invalid FUAFieldFieldInterface - constructor');
            (newError as any).details = result.error;
            throw newError;
        }
        super(aux as FUAFieldInterface);
        this.fields = new Array<FUAField_Field | FUAField_Box | FUAField_Table>
        // Build the children objects
        if(aux.fields){
            // We assume is an array            
            for( let i = 0; i < aux.fields.length; i++){
                try{
                    const auxNewField = FUAField.buildFUAField(aux.fields[i], i);
                    if(auxNewField === null) throw new Error('Invalid value type. ');
                    this.fields.push(auxNewField);
                }catch(error: unknown){
                    console.error(`Error in FUAField Field object - creatingFields (field: ${index} - subfield: ${i}): `, error);
                    (error as Error).message =  `Error in FUAField Field object - creatingFields (field: ${index} - subfield: ${i}): ` + (error as Error).message;
                    throw error;
                }
                
            }            
        }
    }
    
    get getFields(): Array<FUAField_Field | FUAField_Box | FUAField_Table> {
        return this.fields;
    }
    set setFields(value: Array<FUAField_Field | FUAField_Box | FUAField_Table>) {
        this.fields = value;   
    }

    //Overriden method
    render(fieldIndex: number, prefix: string, printMode: boolean, logicAditionalStyles : { value: string; }, mapping?: any): string {
        let auxFields = this.fields;
        //console.log('before: ',mapping?.fields);
        let fieldContent = auxFields.map( (item: FUAField, index: number) => item.renderContent(
            index, 
            `${prefix}-field-${fieldIndex}`, 
            printMode, 
            mapping?.fields.find( (auxField: any) => item.codeName === auxField.codeName )
        ) ).join('');
        logicAditionalStyles.value += `
            width:  ${this.width.toFixed(1)}mm; 
            height: ${this.height.toFixed(1)}mm;  
        `;
        
        fieldContent = `
            <tr>
                <td style="padding: 0px;" class="field-content ${printMode ? 'format-related-print' : ''}"> 
                    ${fieldContent}
                <td>
            </tr>
        `;
        return fieldContent;
    }
}

export default FUAField;