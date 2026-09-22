#include <assert.h>
#define main gcd_example_main
#include "../examples/gcd.c"
#undef main
int main(void) {
    assert(gcd(252, 105) == 21);
    assert(gcd(105, 252) == 21);
    assert(gcd(17, 13) == 1);
    assert(gcd(9, 9) == 9);
    assert(gcd(0, 42) == 42);
    assert(gcd(42, 0) == 42);
    assert(gcd(0, 0) == 0);
    puts("PASS: 7 GCD cases");
    return 0;
}
