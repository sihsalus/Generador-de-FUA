import * as fs from "fs";
import * as path from "path";


// Services

import { dedentCustom, removeBackgroundColor } from "./utils";
import FUAField from "../modelsTypeScript/FUAField";
import FUAFormat from "../modelsTypeScript/FUAFormat";
import FUAPage from "../modelsTypeScript/FUAPage";
import FUASection from "../modelsTypeScript/FUASection";



type auxPaddings = {
    padding_top: number;
    padding_left: number;
}

class FUARenderingUtils {
    
    // Get CSS styles from public/FUA_Previsualization.css
    private static async getCSSStyles(): Promise<string> {
        const cssFilePath = path.resolve(process.cwd(), "./src/public/FUA_Previsualization.css");
        try {
            const fuaPreviewCss = fs.readFileSync(cssFilePath, "utf-8");
            return fuaPreviewCss;
        } catch (err) {
            console.error("Error in FUA Rendering Utils - getCSSStyles: Could not read FUA_Previsualization.css from public directory. ", err);
            throw new Error("Error in FUA Rendering Utils - getCSSStyles: Could not read FUA_Previsualization.css from public directory. ");
        }
        
    }


    // Render a FUA Format using HTML header and body from jsonc schema
    // Pending to validate
    public static async renderFUAFormatFromSchema( FUAFormat : FUAFormat, printMode : boolean, mapping?: any ) : Promise<string> {

        let formatContent = '';
        let pageSizes = {
            value: ''
        };

        // Validate pages
        if( FUAFormat.pages.length === 0 ){
            formatContent = `<p> No pages detected. </p>`;
        }else{   
            formatContent = FUAFormat.pages.map((item: any, index: number) => this.renderFUAPageFromSchema(
                item, 
                index+1,
                pageSizes, 
                printMode, 
                mapping?.pages[index]
            )).join('');            
        }

        // Get CSS style from public folder
        let cssStyles = '';
        try{
            cssStyles = await this.getCSSStyles();
        }catch(error: unknown){
            (error as Error).message =  'Error in FUA Rendering Utils - renderFUAFormat: ' + (error as Error).message; 
            throw error;
        }

        let htmlContent = dedentCustom(`
            <!DOCTYPE html>
            <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Previsualizacion de FUA</title>
                    <style>
                        ${cssStyles}
                        ${pageSizes.value}
                    </style>
                </head>
                <body>
                    
                        ${ formatContent }
                                        
                </body>
            </html>
        `);

        return htmlContent;
    };

    // Render FUA Page from jsonc schema
    public static renderFUAPageFromSchema( auxFUAPage : FUAPage, pageIndex: number, pageSizes: { value: string} ,printMode: boolean, mapping?: any ): string {
        
        let pageContent = '';
        
   
        // Get FUA Format Sections
        let auxFUASections = auxFUAPage.sections;

        // Validate sections
        if( auxFUASections.length === 0){
            pageContent = ``;
        }else{            
            const paddings : auxPaddings = {
                padding_top:    auxFUAPage.padding_top,
                padding_left:   auxFUAPage.padding_left,
            };
            // check if thres any mapping for the page
            pageContent = auxFUASections.map( (item: FUASection, index: number) => this.renderFUASectionFromSchema(
                item, 
                index, 
                `fua-page-${pageIndex.toString()}`,
                paddings, 
                printMode, 
                mapping?.sections.find( (section: any) => section.codeName == item.codeName )
            )).join('');
        }

        // Get page sizes
        let auxPageSizes: string = `
            @page fua-page-size-${pageIndex.toString()} {
                margin: 0;
                size: ${auxFUAPage.width.toFixed(1)}mm ${auxFUAPage.height.toFixed(1)}mm;
            }

            #fua-page-${pageIndex.toString()} {
                page: fua-page-size-${pageIndex.toString()};
                width: ${auxFUAPage.width.toFixed(1)}mm;
                height: ${auxFUAPage.height.toFixed(1)}mm;
                page-break-after: always;
            }
        `;
        pageSizes.value += auxPageSizes;

        let htmlContent = `

            <div id="fua-page-${pageIndex.toString()}" class="fua-page ${printMode ? 'format-related-print' : ''}" ${auxFUAPage.extraStyles !== undefined ? `style="${auxFUAPage.extraStyles}"` : ""}>
                ${ pageContent }
            </div>
     
        `;

        return htmlContent;
    };

    // Render FUA Section from jsonc schema
    public static renderFUASectionFromSchema( auxFUASection : FUASection, sectionIndex: number, prefix: string, paddings: auxPaddings , printMode : boolean, mapping?: any): string {
        
        let sectionContent = '';
        

        // title, showTitle
        let title = '';
        if(auxFUASection.showTitle === true){ 
            title = `
                <tr>
                    <th class="section-header text-container ${printMode ? 'format-related-print' : ''}" style="height: ${auxFUASection.titleHeight?.toFixed(1)}mm;" > ${auxFUASection.title ?? ''} </th>
                </tr>
            `;            
        }

        // Get section content
        if (!Array.isArray(auxFUASection.fields) || auxFUASection.fields.length === 0) {
            sectionContent = ``;
        }else{
            //sectionContent = auxFUASection.fields.map( (item: any, index: number) => this.renderFUAFieldFromSchema(item,index,`${prefix}-section-${sectionIndex.toString()}`,printMode) ).join('');
            sectionContent = auxFUASection.fields.map( (field: FUAField, index: number) => field.renderContent(
                index,
                `${prefix}-section-${sectionIndex.toString()}`,
                printMode,
                mapping?.fields.find( (auxField: any) => auxField.codeName == field.codeName ) 
            ) ).join('');
        }

        let htmlContent = `
            <style>
                #${prefix}-section-${sectionIndex.toString()} {
                    ${ Number.isFinite(auxFUASection.top)  ? `top: ${ (paddings.padding_top + auxFUASection.top ).toFixed(1)}mm;` : ''}
                    ${ Number.isFinite(auxFUASection.left) ? `left: ${ ( paddings.padding_left + auxFUASection.left ).toFixed(1)}mm;` : ''}
                    width: ${ auxFUASection.bodyWidth ? `${auxFUASection.bodyWidth.toFixed(1)}mm;` : '100%;'}
                    ${auxFUASection.extraStyles}
                }
            </style>
            <table id="${prefix}-section-${sectionIndex.toString()}" class="table-section ${printMode ? 'format-related-print' : ''}" >                  
                ${title}    
                <tr style="height: ${auxFUASection.bodyHeight.toFixed(1)}mm;">                    
                    <td class="section-content">
                        ${sectionContent}
                    </td>
                </tr>                           
            </table>
        `;

        return htmlContent;
    };


    //Erase the border by the position of the label
    public static eraseBorderOfFieldCaption(captionSide?: string): any {
        if(captionSide == undefined) {
            captionSide = 'Top'; // Assume Top aas default case
        }
        let baseStyle = `
            display: flex; 
            justify-content: center; 
            align-items: center;
        `;
        let captionStyle = 'border-bottom: none';
        let flexDir = 'column';

        switch(captionSide){
            case `Top`:
                captionStyle = 'border-bottom: none; ' + baseStyle;
                break;
            case 'Left':
                flexDir = 'row';
                captionStyle = 'border-right: none; ' + baseStyle;
                break;
            case 'Right':
                flexDir = 'row';
                captionStyle = 'border-left:none; ' + baseStyle;
                break;
            case `Bottom`:
                captionStyle = 'border-top: none; ' + baseStyle;
                break;
        }
        return { 
            captionStyle: captionStyle,
            flexDir: flexDir
        };
    }

    public static renderFUAFieldFromSchema_renderLabel( auxFUAField : FUAField, prefix: string, printMode: boolean, fieldIndex: number) : { labelContent: string; flexDir: string } {
        let label = '';
        let flexDir = '';
        if(auxFUAField.showLabel == true){
            const aux = this.eraseBorderOfFieldCaption(auxFUAField.labelPosition);
            flexDir = aux.flexDir;
            const captionStyle = aux.captionStyle;
            label = `
                <style>
                    #${prefix}-field-${fieldIndex}-caption {
                        ${captionStyle}             
                        ${(auxFUAField.labelPosition === 'Left' || auxFUAField.labelPosition === 'Right') ? `width: ${auxFUAField.labelWidth ? auxFUAField.labelWidth.toFixed(1)+'mm;' : '100%;'}` : ''}   
                        ${(auxFUAField.labelPosition === 'Top' || auxFUAField.labelPosition === 'Bottom') ? (auxFUAField.labelHeight ? `height: ${auxFUAField.labelHeight.toFixed(1)}mm;` : 'height: 2.0mm;' ) : ''}
     
                        
                        font-weight: bold;
                        background-color: lightgray;
                        ${auxFUAField.labelHeight ? `height: ${auxFUAField.labelHeight.toFixed(1)}mm;` : ''}
                        ${auxFUAField.labelHeight ? `line-height: ${auxFUAField.labelHeight.toFixed(1)}mm;` : ''}
                        ${auxFUAField.labelExtraStyles ? (printMode == true ? removeBackgroundColor(auxFUAField.labelExtraStyles) : auxFUAField.labelExtraStyles) : ``}
                    }
                </style>
                <div id="${prefix}-field-${fieldIndex}-caption" class="field-border text-container ${printMode ? 'format-related-print' : ''}">
                    ${auxFUAField.label}
                </div>
            `;            
        }
        return {
            labelContent: label,
            flexDir: flexDir
        };
    }

    /* public static renderFUAFieldFromSchema_renderFieldContent( auxFUAField : FUAField, prefix: string, printMode: boolean, fieldIndex: number, label: string, colgroups: string) : string {
        let fieldContent = '';
        fieldContent = `
            <style>
                #${prefix}-field-${fieldIndex} {
                    top:    ${auxFUAField.top.toFixed(1)}mm;
                    left:   ${auxFUAField.left.toFixed(1)}mm;
                    ${auxFUAField.extraStyles}
                    ${auxFUAField.width}
                }
            </style>
            <table id="${prefix}-field-${fieldIndex}" class="table-field ${printMode ? 'format-related-print' : ''}" >
                ${label}
                ${colgroups}
                ${fieldContent}
            </table>
        `;

        return fieldContent;
    } */

    // Render FUA Field from jsonc schema
    public static renderFUAFieldFromSchema( auxFUAField : any, fieldIndex: number, prefix: string, printMode : boolean): string {
        let fieldContent = '';
        let extraStyles = '';
        let auxWidth = '100%;';
        let flexDir = null;
        
        let label = '';
        if(auxFUAField.showLabel == true){
            const aux = this.eraseBorderOfFieldCaption(auxFUAField.labelPosition);
            flexDir = aux.flexDir;
            const captionStyle = aux.captionStyle;
            label = `
                <style>
                    #${prefix}-field-${fieldIndex}-caption {
                        ${captionStyle}             
                        ${(auxFUAField.labelPosition === 'Left' || auxFUAField.labelPosition === 'Right') ? `width: ${auxFUAField.labelWidth.toFixed(1)}mm;` : ''}   
                        ${(auxFUAField.labelPosition === 'Left' || auxFUAField.labelPosition === 'Right') ? '' : (auxFUAField.labelHeight ? `height: ${auxFUAField.labelHeight.toFixed(1)}mm;` : 'height: 2.0mm;' )}
                        ${auxFUAField.labelHeight ? `line-height: ${auxFUAField.labelHeight.toFixed(1)}mm;` : 'height: 2.0mm;'}        
                        font-weight: bold;
                        background-color: lightgray;
                        ${auxFUAField.labelHeight ? `height: ${auxFUAField.labelHeight.toFixed(1)}mm;` : ''}
                        ${auxFUAField.labelHeight ? `line-height: ${auxFUAField.labelHeight.toFixed(1)}mm;` : ''}
                        ${auxFUAField.labelExtraStyles ? (printMode == true ? removeBackgroundColor(auxFUAField.labelExtraStyles) : auxFUAField.labelExtraStyles) : ``}
                    }
                </style>
                <div id="${prefix}-field-${fieldIndex}-caption" class="field-border text-container ${printMode ? 'format-related-print' : ''}">
                    ${auxFUAField.label}
                </div>
            `;            
        }

        let colgroups = '';

        if(auxFUAField.valueType === "Table"){
            let auxWidthValue = 0.0;
            // Define colgroups
            let auxColumns = auxFUAField.columns;
            auxColumns = auxFUAField.columns.map((item: any) => `<col style="width: ${item.width.toFixed(1)}mm;" />` );      
            
            colgroups  = `
                <colgroup>
                    ${auxColumns.join('')}
                </colgroup>
            `;
            auxWidthValue = auxFUAField.columns.reduce((auxWidthValue: number, obj: any) => auxWidthValue + parseFloat(obj.float || 0), 0);
            auxWidth = 'width: '+auxWidthValue.toFixed(1)+'mm;'
            // Defining rows, ordered by 'index' attribute
            let auxRows = auxFUAField.rows.sort( (a: any, b: any) => ( a.index - b.index ) );
            // Process row
            auxRows = auxRows.map( (row: any, index: number) => this.renderFUAFieldTableRowFromSchema(row, index, auxColumns.length ,`${prefix}-field-${fieldIndex}`, printMode) );
            fieldContent = auxRows.join('');
        }

        if( auxFUAField.valueType === "Box"){
            fieldContent = `
                <tr>
                    <td class="text-container ${printMode ? 'format-related-print' : ''}" > ${auxFUAField.text ?? ''} </td>
                </tr>
            `;
            extraStyles = `
                height: ${auxFUAField.height.toFixed(1)}mm;  
            `;
        }

        if (auxFUAField.valueType === "Field"){
            let auxFields = auxFUAField.fields;
            let finalContent = auxFields.map( (item: any, index: number) => this.renderFUAFieldFromSchema( item, index, `${prefix}-field-${fieldIndex}`, printMode) ).join('');
            extraStyles = `
                width:  ${auxFUAField.width.toFixed(1)}mm;    
                height: ${auxFUAField.height.toFixed(1)}mm;  
            `;
            fieldContent = `
                <tr>
                    <td style="padding: 0px; position: relative;" class="field-content ${printMode ? 'format-related-print' : ''}">
                        ${finalContent}
                    </td>
                </tr>
            `;
        }
        
        
        fieldContent = `
            <style>
                #${prefix}-field-${fieldIndex} {
                    top:    ${auxFUAField.top.toFixed(1)}mm;
                    left:   ${auxFUAField.left.toFixed(1)}mm;
                    ${auxWidth}
                    position: absolute;
                }
                #${prefix}-field-${fieldIndex}-content {
                    ${extraStyles}                    
                }
            </style>
            <div id="${prefix}-field-${fieldIndex}" class="${printMode ? 'format-related-print' : ''}" style="width: ${auxFUAField.valueType === 'Table' ? 'min-content;' : auxFUAField.width.toFixed(1)+'mm;'} border: none; padding: 0; background: none; display: flex; ${flexDir ? `flex-direction: ${flexDir};` : ''}">
                ${ auxFUAField.labelPosition === 'Top' || auxFUAField.labelPosition === 'Left' ? label : ''}
                <table id="${prefix}-field-${fieldIndex}-content" class="table-field" style="${auxFUAField.height ? auxFUAField.height.toFixed(1)+'mm; ' : ''} width: ${ auxFUAField.valueType === 'Table' ? 'fit-content' : ''};">                    
                    ${colgroups}
                    ${fieldContent}
                </table>
                ${auxFUAField.labelPosition === 'Bottom' || auxFUAField.labelPosition === 'Right' ? label : ''}
            </div>
        `;


        return fieldContent;
    };

    // Render FUA Field row from jsonc schema
    public static renderFUAFieldTableRowFromSchema( auxRow : any, index : number, colAmount : number, prefix: string, printMode : boolean) : string {
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
            let auxCellContent = `
                ${extraStyles}
                <td id="${prefix}-row-${index}-cell-${i}" class="field-border text-container ${printMode ? 'format-related-print' : ''}" > 
                    ${cells?.[i]?.text ?? ''} 
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


    // Generate demo mappings from visit json payload
}

export default FUARenderingUtils;