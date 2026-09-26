package main

import (
	"debug/elf"
	"encoding/binary"
	"fmt"
	"os"
	"strconv"
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
	target, _ := strconv.ParseUint(os.Args[2], 0, 64)
	for i := uint64(0); i < nfunc; i++ {
		eo := binary.LittleEndian.Uint32(pcln[pclnOff+i*8:])
		fo := binary.LittleEndian.Uint32(pcln[pclnOff+i*8+4:])
		entry := textStart + uint64(eo)*quantum
		if entry != target { continue }
		fb := pclnOff + uint64(fo)
		raw := pcln[fb : fb+48]
		fmt.Printf("_func @pclnOff+%#x: %x\n", fo, raw)
		for j := 0; j < 11; j++ {
			fmt.Printf("  +%d: %#x (%d)\n", j*4, binary.LittleEndian.Uint32(raw[j*4:]), binary.LittleEndian.Uint32(raw[j*4:]))
		}
		nameOff := binary.LittleEndian.Uint32(raw[4:])
		no := funcnameOff + uint64(nameOff)
		end := no
		for pcln[end] != 0 { end++ }
		fmt.Println("name:", string(pcln[no:end]))
		break
	}
}
