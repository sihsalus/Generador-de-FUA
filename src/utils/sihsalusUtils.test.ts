import {describe, expect, test} from '@jest/globals';   
import { getShortnameFromSIHSALUS } from './sihsalusUtils';

// Test- isValidUUIDv6
describe('Utils - getShortnameFromSIHSALUS function', () => {
    const concept = '6f31e5e8-fe47-4bfb-a8ea-9e185ebc05ed'; // Concept ANEMIA DISERITROPOYETICA CONGENITA 
    
    test('Check CIE-10 code of ANEMIA DISERITROPOYETICA CONGENITA: ', async () => {
        const data = await getShortnameFromSIHSALUS(concept);

        expect(data).toBe('D644');
  });
});
