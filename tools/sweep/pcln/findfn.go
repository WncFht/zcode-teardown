package main

import (
	"debug/elf"
	"encoding/binary"
	"fmt"
	"os"
	"strings"
)

func main() {
	f, _ := elf.Open(os.Args[1])
	defer f.Close()
	pcln, _ := f.Section(".gopclntab").Data()
	quantum := uint64(pcln[6])
	nfunc := binary.LittleEndian.Uint64(pcln[8:])
	textStart := binary.LittleEndian.Uint64(pcln[24:])
	funcnameOff := binary.LittleEndian.Uint64(pcln[32:])
	pclnOff := binary.LittleEndian.Uint64(pcln[64:])
	pat := os.Args[2]
	for i := uint64(0); i < nfunc; i++ {
		eo := binary.LittleEndian.Uint32(pcln[pclnOff+i*8:])
		fo := binary.LittleEndian.Uint32(pcln[pclnOff+i*8+4:])
		fb := pclnOff + uint64(fo)
		nameOff := binary.LittleEndian.Uint32(pcln[fb+4:])
		no := funcnameOff + uint64(nameOff)
		end := no
		for pcln[end] != 0 { end++ }
		name := string(pcln[no:end])
		if strings.Contains(name, pat) {
			fmt.Printf("%#x %s\n", textStart+uint64(eo)*quantum, name)
		}
	}
}
