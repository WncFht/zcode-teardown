package main

import (
	"debug/elf"
	"fmt"
	"os"
	"strconv"
)

func main() {
	f, _ := elf.Open(os.Args[1])
	defer f.Close()
	args := os.Args[2:]
	for i := 0; i+1 < len(args); i += 2 {
		va, _ := strconv.ParseUint(args[i], 0, 64)
		n, _ := strconv.ParseUint(args[i+1], 0, 64)
		for _, s := range f.Sections {
			if s.Addr <= va && va < s.Addr+s.Size && s.Type == elf.SHT_PROGBITS {
				data, _ := s.Data()
				off := va - s.Addr
				end := off + n
				if end > uint64(len(data)) { end = uint64(len(data)) }
				fmt.Printf("%#x+%d: %q\n", va, n, data[off:end])
				break
			}
		}
	}
}
