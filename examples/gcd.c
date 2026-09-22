#include <stdio.h>

/* Euclid's algorithm: gcd(a, b) = gcd(b, a % b).
 * Unsigned inputs; gcd(0, 0) returns 0 by convention.
 */
unsigned int gcd(unsigned int a, unsigned int b)
{
    while (b != 0) {
        unsigned int remainder = a % b;
        a = b;
        b = remainder;
    }
    return a;
}

int main(void)
{
    unsigned int a = 252;
    unsigned int b = 105;
    unsigned int result = gcd(a, b);
    printf("gcd(%u, %u) = %u\n", a, b, result);
    return 0;
}
