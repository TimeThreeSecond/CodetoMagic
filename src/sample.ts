import gcd from '../examples/gcd.c?raw';
import dijkstra from '../examples/dijkstra.c?raw';
import pi from '../examples/pi.py?raw';
export const samples: Record<string,string> = {
 'dijkstra.c': dijkstra,
 'gcd.c': gcd,
 'pi.py': pi,
 'memory.c': `#include <stdio.h>\n#include <stdlib.h>\n\nint sum_positive(int *values, int count) {\n    int total = 0;\n    for (int i = 0; i < count; i++) {\n        if (values[i] > 0) {\n            total += values[i];\n        }\n    }\n    return total;\n}\n\nint main(void) {\n    int *values = malloc(4 * sizeof(int));\n    if (values == NULL) return 1;\n    for (int i = 0; i < 4; i++) {\n        values[i] = i * 7 - 3;\n    }\n    int result = sum_positive(values, 4);\n    printf("sum = %d\\n", result);\n    free(values);\n    return 0;\n}\n`,
 'recursion.c': `#include <stdio.h>\n\nint factorial(int n) {\n    if (n <= 1) return 1;\n    return n * factorial(n - 1);\n}\n\nint main(void) {\n    int answer = factorial(6);\n    printf("%d\\n", answer);\n    return 0;\n}\n`,
 'branches.c': `#include <stdio.h>\n\nint classify(int value) {\n    switch (value) {\n        case 0: return 0;\n        case 1: return 1;\n        default: return -1;\n    }\n}\n\nint main(void) {\n    int n = 3;\n    while (n > 0) {\n        printf("%d\\n", classify(n));\n        n--;\n    }\n    do { n++; } while (n < 2);\n    return 0;\n}\n`
};
