import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Trophy } from "lucide-react";
type Props = { accuracy: number };

const ResultsCard = ({ accuracy }: Props) => {
  return (
    <Card className="md:col-span-7">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <CardTitle className="text-2xl font-bold">Resumen</CardTitle>
        <Award />
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center h-3/5">
        {accuracy > 75 ? (
          <>
            <Trophy className="mr-4" stroke="gold" size={50} />
            <div className="flex flex-col text-2xl font-semibold text-yellow-400">
              <span className="">Iimpresionante!</span>
              <span className="text-sm text-center text-black opacity-50">
                {"> 75% exactitud"}
              </span>
            </div>
          </>
        ) : accuracy > 25 ? (
          <>
            <Trophy className="mr-4" stroke="silver" size={50} />
            <div className="flex flex-col text-2xl font-semibold text-stone-400">
              <span className="">Buen trabajo!</span>
              <span className="text-sm text-center text-black opacity-50">
                {"> 25% exactitud"}
              </span>
            </div>
          </>
        ) : (
          <>
            <Trophy className="mr-4" stroke="brown" size={50} />
            <div className="flex flex-col text-2xl font-semibold text-yellow-800">
              <span className="">Buen intento!</span>
              <span className="text-sm text-center text-black opacity-50">
                {"< 25% exactitud"}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ResultsCard;
